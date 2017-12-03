'use babel'
/* global atom */
import { basename, dirname } from 'path'
import { CompositeDisposable } from 'atom'
import makeTreeViewGitBranchList from './branch-list.js'
import { addEventListener } from './utils.js'
import { name as packageName } from '../package'
import { getBranches } from './git'

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
        switch (atom.config.get('tree-view-git-branch-fix.location')) {
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
                this.insertBefore(this.getFirstDirectoryEl())

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
        const projectPath = dirname(this.repository.getPath())
        const selector = `[data-root="${projectPath.replace(/\\/g, '\\\\')}"]`
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const result = treeViewEl.querySelector(selector)
                resolve(result)
            }, 1000)
        })
    },

    getFirstProjectRoot(treeViewEl) {
        return treeViewEl.querySelector('.project-root')
    },

    getFirstDirectoryEl() {
        return this.projectRoot.querySelector('[is="tree-view-directory"]')
    },

    setSeparator(show) {
        const addOrRemove = show && atom.config.get('tree-view-git-branch-fix.separator') ? 'add' : 'remove'
        switch (atom.config.get('tree-view-git-branch-fix.location')) {
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
