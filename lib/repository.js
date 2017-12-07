'use babel'
/* global atom */
import { basename, dirname } from 'path'
import { CompositeDisposable } from 'atom'
import makeTreeViewGitBranchList from './branch-list.js'
import { addEventListener } from './utils.js'
import { name as packageName } from '../package'
import { getBranches } from './git'
import os from 'os'
import clipboardy from 'clipboardy'

const repositoryProto = {
    async initialize(repository, treeViewEl, updateFn, parent) {
        try {
            this.mainModule = parent
            this.repository = repository
            this.projectRoot = await this.getProjectRoot(treeViewEl)
            this.branches = makeTreeViewGitBranchList({
                repository: repository,
                icon: 'git-branch',
                title: `branches [${basename(dirname(repository.getPath()))}]`,
                updateFn,
            })
            this.observeConfig()
            await this.update(treeViewEl, updateFn)
        } catch (e) {
            console.error('fail in initialize', e)
        }
    },

    observeConfig() {
        this.showRemote = atom.config.get(`${packageName}.showRemote`)
        atom.config.observe(`${packageName}.showRemote`, value => {
            this.showRemote = value
        })
    },
    destroy() {
        this.branches.destroy()
        if (this.disposables) {
            this.disposables.dispose()
        }
        [this.branches, this.disposables, this.repository, this.projectRoot] = []
    },

    async update(treeViewEl, updateFn) {
        if (this.willCauseProjectRootNullException()) {
            return
        }
        const location = atom.config.get('tree-view-git-branch-fix.location')
        switch (location) {
            case 'top':
                this.insertBefore(this.getFirstProjectRoot(treeViewEl))
                if (this.disposables) {
                    this.disposables.dispose()
                    this.disposables = null
                }
                break
            case 'before':
                this.insertBefore(this.projectRoot)
                if (this.disposables) {
                    this.disposables.dispose()
                    this.disposables = null
                }
                break
            case 'inside':
                const injectPoint = this.getFirstDirectoryEl()
                if (injectPoint) {
                    this.insertBefore(injectPoint)
                }

                if (!this.disposables) {
                    this.disposables = new CompositeDisposable(
                        addEventListener(this.projectRoot, 'click', event => {
                            if (event.target.closest('li') != this.projectRoot) {
                                return
                            }

                            process.nextTick(() => {
                                if (!this.projectRoot.classList.contains('collapsed')) {
                                    this.insertBefore(this.getFirstDirectoryEl())
                                }
                            })
                        }),

                        atom.commands.add(treeViewEl, {
                            'tree-view:expand-item': () => {
                                this.insertBefore(this.getFirstDirectoryEl())
                            },
                            'tree-view:expand-recursive-directory': () => {
                                this.insertBefore(this.getFirstDirectoryEl())
                            },
                        })
                    )
                }
                break
        }
        try {
            const entries = await getBranches(this.showRemote, this.repository)
            this.branches.setEntries(entries, updateFn)
        } catch (e) {
            console.error('Error in getEntries', e)
        }
    },

    getProjectRoot(treeViewEl) {
        const repo = this.repository.repo
        // if current project is a link , the openedWorkingDirectory will have value, else workingDirectory will have value
        const projectPath = repo.openedWorkingDirectory || repo.workingDirectory
        if (os.platform() === 'win32') {
            return this.getProjectRootForWin(treeViewEl, projectPath)
        }
        const selector = `[data-root="${projectPath.replace(/\\/g, '\\\\')}"]`
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const result = treeViewEl.querySelector(selector)
                if (!result) {
                    this.logVariablesAndAlert(projectPath, selector, treeViewEl.innerHTML)
                }
                resolve(result)
            }, 1000)
        })
    },

    getProjectRootForWin(treeViewEl, projectPath) {
        const selector = `[data-path="${projectPath.replace(/\\/g, '\\\\')}"]`
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const result = treeViewEl.querySelector(selector).parentNode.parentNode
                if (!result) {
                    this.logVariablesAndAlert(projectPath, selector, treeViewEl.innerHTML)
                }
                resolve(result)
            }, 1000)
        })
    },
    logVariablesAndAlert(projectPath, selector, html) {
        if (this.mainModule.errorShowed) {
            return
        }
        const variableInfo = JSON.stringify({ projectPath, selector, html }, null, 4)
        atom.confirm({
            message: 'Project root not found',
            detailedMessage: `The branches can not show because the project root is missing. Please copy the error log and create an issue in this package's repo. A workaround currently: set 'location' of 'tree-view-git-branch-fix' to 'top'`,
            buttons: {
                'set and copy'() {
                    atom.config.set('tree-view-git-branch-fix.location', 'top')
                    clipboardy.writeSync(variableInfo)
                    atom.notifications.addSuccess('Log copied to clipboard!')
                },
                'set location to top'() {
                    atom.config.set('tree-view-git-branch-fix.location', 'top')
                },
                'copy error log'() {
                    clipboardy.writeSync(variableInfo)
                    atom.notifications.addSuccess('Log copied to clipboard!')
                },
                cancel() {
                    console.info(this)
                },
            },
        })
        this.mainModule.errorShowed = true
    },
    getFirstProjectRoot(treeViewEl) {
        return treeViewEl.querySelector('.project-root')
    },

    getFirstDirectoryEl() {
        return this.projectRoot.querySelector('.entries .entry')
    },

    setSeparator(show) {
        const location = atom.config.get('tree-view-git-branch-fix.location')
        if (!this.projectRoot) {
            return
        }
        const addOrRemove = show && atom.config.get('tree-view-git-branch-fix.separator') ? 'add' : 'remove'
        switch (location) {
            case 'top':
                this.branches.classList.remove('separator')
                this.projectRoot.classList.remove('separator')
                break
            case 'before':
                this.branches.classList[addOrRemove]('separator')
                this.projectRoot.classList.remove('separator')
                break
            case 'inside':
                this.projectRoot.classList[addOrRemove]('separator')
                this.branches.classList.remove('separator')
                break
        }
    },
    willCauseProjectRootNullException() {
        const location = atom.config.get('tree-view-git-branch-fix.location')
        return location !== 'top' && !this.projectRoot
    },

    insertBefore(el) {
        el.parentNode.insertBefore(this.branches, el)
    },
}

export default async function makeTreeViewGitRepository(...args) {
    try {
        const obj = Object.create(repositoryProto)
        await obj.initialize(...args)
        return obj
    } catch (e) {
        console.info(`error`, e)
    }
}
