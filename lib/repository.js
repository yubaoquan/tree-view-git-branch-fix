'use babel'
/* global atom */
import { basename, dirname } from 'path'
import { CompositeDisposable } from 'atom'
import makeTreeViewGitBranchList from './branch-list.js'
import { addEventListener } from './utils.js'
import { name as packageName } from '../package'
import { getBranches } from './git'
import os from 'os'

const repositoryProto = {
    async initialize(repository, treeViewEl, updateFn) {
        try {
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
            atom.notifications.addError('Project root not found', {
                description: 'The branches can not show because the project root is missing. Maybe what you are opening is not the real project but a link to it. A workaround: You can set location of `tree-view-git-branch-fix` to `top`',
                buttons: [
                    {
                        text: 'set location to top',
                        onDidClick() {
                            atom.config.set('tree-view-git-branch-fix.location', 'top')
                            this.removeNotification()
                        },
                    }, {
                        text: 'cancel',
                        onDidClick() {
                            this.removeNotification()
                        },
                    },
                ],
            })
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
        if (os.platform() === 'win32') {
            return this.getProjectRootForWin(treeViewEl)
        }
        const projectPath = dirname(this.repository.getPath())
        const selector = `[data-root="${projectPath.replace(/\\/g, '\\\\')}"]`
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const result = treeViewEl.querySelector(selector)
                console.info(result)
                resolve(result)
            }, 1000)
        })
    },

    getProjectRootForWin(treeViewEl) {
        const projectPath = dirname(this.repository.getPath())
        const selector = `[data-path="${projectPath.replace(/\\/g, '\\\\')}"]`
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const result = treeViewEl.querySelector(selector).parentNode.parentNode
                resolve(result)
            }, 1000)
        })
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
