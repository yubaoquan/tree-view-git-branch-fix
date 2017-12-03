'use babel'
/* global atom */
import { basename, dirname } from 'path'
import { CompositeDisposable } from 'atom'
import makeTreeViewGitBranchList from './branch-list.js'
import { addEventListener } from './utils.js'

const repositoryProto = {
    async initialize(repository, treeViewEl) {
        try {
            this.repository = repository
            this.projectRoot = await this.getProjectRoot(treeViewEl)
            this.branches = makeTreeViewGitBranchList({
                repository: repository,
                icon: 'git-branch',
                title: `branches [${basename(dirname(repository.getPath()))}]`,
            })

            this.update(treeViewEl)
        } catch (e) {
            console.error('fail in initialize', e)
        }
    },

    destroy() {
        this.branches.destroy()
        if (this.disposables) {
            this.disposables.dispose()
        }
        [this.branches, this.disposables, this.repository, this.projectRoot] = []
    },

    update(treeViewEl) {
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

        this.branches.setEntries(this.repository.getReferences().heads)
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
