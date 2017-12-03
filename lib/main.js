'use babel'
/* global atom */
import { CompositeDisposable } from 'atom'
import makeTreeViewGitRepository from './repository.js'
import { name as packageName } from '../package'

// maps repositories to their respective view
const treeViewGitRepositories = new Map()

// remove old repositories
function removeOldRepositories(currentRepositories) {
    for (const repository of treeViewGitRepositories.keys()) {
        if (currentRepositories.indexOf(repository) == -1) {
            treeViewGitRepositories.get(repository).destroy()
            treeViewGitRepositories.delete(repository)
        }
    }
}
let order = 1
export default Object.assign({}, {
    config: {
        activateOnStartup: {
            order: order++,
            description: 'Show the git branch in tree-view right after atom startup',
            type: 'boolean',
            default: true,
        },
        location: {
            order: order++,
            description: 'Location of the items in the tree view.<br>Top: all at the top of the tree view.<br>Before: before the corresponding project directory.<br>Inside: as the first item in the corresponding project directory, this is the default.',
            type: 'string',
            default: 'top',
            enum: [
                'top',
                'before',
                'inside',
            ],
        },
        separator: {
            order: order++,
            description: 'Draw a separator between a project and the next branch list. Does nothing when the "location" setting is "top".',
            type: 'boolean',
            default: false,
        },
        showRemote: {
            order: order++,
            type: 'boolean',
            default: false,
            description: 'Show remote branches',
        },
        openBranchListAction: {
            order: order++,
            description: 'Single or double click on branch list to open it',
            type: 'string',
            default: 'single',
            enum: [
                {
                    value: 'single',
                    description: 'Single click',
                }, {
                    value: 'double',
                    description: 'Double click',
                },
            ],
        },
        switchBranchAction: {
            order: order++,
            description: 'Single or double click on branch to switch to it',
            type: 'string',
            default: 'single',
            enum: [
                {
                    value: 'single',
                    description: 'Single click',
                }, {
                    value: 'double',
                    description: 'Double click',
                },
            ],
        },
    },
    activate() {
        const activateOnStartup = atom.config.get(`${packageName}.activateOnStartup`)
        if (activateOnStartup) {
            this.doActivate()
        } else {
            this.listenOnToggle()
        }
    },
    listenOnToggle() {
        atom.commands.add('atom-workspace', `${packageName}:toggle`, () => {
            this.doActivate()
        })
    },
    doActivate() {
        // resolves with the tree view package
        // object if and when it is loaded, or
        // with false if it isn't
        Promise.resolve(
            atom.packages.isPackageLoaded('tree-view') &&
            atom.packages.activatePackage('tree-view')
        ).then(treeViewPkg => {
            const treeViewEl = treeViewPkg.mainModule.treeView.element
            this.treeViewEl = treeViewEl

            // do nothing if the tree view packages isn't loaded
            if (!treeViewPkg) {
                atom.notifications.addError('tree-view package not loaded', {
                    detail: `${packageName} requires the tree view package to be loaded`,
                })
                return
            }

            this.disposables = new CompositeDisposable(
                atom.project.onDidChangePaths(() => this.update()),

                atom.commands.add('atom-workspace', `${packageName}:reload`, () =>
                    this.update()
                ),

                atom.commands.add('atom-workspace', `${packageName}:toggle`, () => {
                    this.deactivate()
                }),

                atom.config.onDidChange(`${packageName}.location`, () =>
                    this.update()
                ),

                atom.config.onDidChange(`${packageName}.separator`, () =>
                    this.update()
                ),
                atom.config.onDidChange(`${packageName}.showRemote`, () => {
                    this.update()
                })
            )

            this.update()
        }).catch(error =>
            console.error(error.message, error.stack)
        )
    },
    // update tracked repositories and add new ones
    updateRepositories(currentRepositories, treeViewEl) {
        currentRepositories.forEach(async (repository, i) => {
            // skip if project root isn't a git repository
            if (!repository) {
                return
            }

            try {
                this.treeViewGitRepository = treeViewGitRepositories.get(repository)
                // console.info(repository) // for debug
                this.treeViewGitRepository.update(treeViewEl, this.update.bind(this))
            } catch (e) {
                try {
                    this.treeViewGitRepository =
                        await makeTreeViewGitRepository(
                            repository, treeViewEl, this.update.bind(this)
                        )
                } catch (e) {
                    console.info(e)
                }
                treeViewGitRepositories.set(repository, this.treeViewGitRepository)
            }

            this.treeViewGitRepository.setSeparator(i)
        })
    },
    update() {
        const treeViewEl = this.treeViewEl
        Promise.all(
            atom.project.getDirectories().map(
                atom.project.repositoryForDirectory.bind(atom.project)
            )
        ).then(repositories => {
            removeOldRepositories(repositories)
            this.updateRepositories(repositories, treeViewEl)
        })
    },
    deactivate() {
        this.treeViewGitRepository.destroy()
        this.disposables.dispose()
        this.listenOnToggle()
    },
})
