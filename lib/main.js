'use babel'
/* global atom */
import { CompositeDisposable } from 'atom'
import makeTreeViewGitRepository from './repository.js'

/* eslint-disable vars-on-top */
const config = {
    location: {
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
        description: 'Draw a separator between a project and the next branch list. Does nothing when the "location" setting is "top".',
        type: 'boolean',
        default: false,
    },
}

let disposables

// maps repositories to their respective view
const treeViewGitRepositories = new Map()
/* eslint-enable vars-on-top */

// remove old repositories
function removeOldRepositories(currentRepositories) {
    for (const repository of treeViewGitRepositories.keys()) {
        if (currentRepositories.indexOf(repository) == -1) {
            treeViewGitRepositories.get(repository).destroy()
            treeViewGitRepositories.delete(repository)
        }
    }
}

// update tracked repositories and add new ones
function updateRepositories(currentRepositories, treeViewEl) {
    currentRepositories.forEach(async (repository, i) => {
        let treeViewGitRepository

        // skip if project root isn't a git repository
        if (!repository) {
            console.info(`no reporsitory`)
            return
        }
        console.info(repository)

        try {
            treeViewGitRepository = treeViewGitRepositories.get(repository)
            console.info(treeViewGitRepository)
            treeViewGitRepository.update(treeViewEl)
        } catch (e) {
            console.info(`catch`)
            try {
                console.info(`try in catch`)
                treeViewGitRepository = await makeTreeViewGitRepository(repository, treeViewEl)
                console.info(`after await`, treeViewGitRepository)
            } catch (e) {
                console.info(`catch in catch`)
                console.info(e)
            }
            console.info('in catch', treeViewGitRepository)
            treeViewGitRepositories.set(repository, treeViewGitRepository)
        }

        treeViewGitRepository.setSeparator(i)
    })
}

function update(treeViewEl) {
    Promise.all(
        atom.project.getDirectories().map(
            atom.project.repositoryForDirectory.bind(atom.project)
        )
    ).then(repositories => {
        removeOldRepositories(repositories)
        updateRepositories(repositories, treeViewEl)
    })
}

function activate() {
    console.info('activate')
    // resolves with the tree view package
    // object if and when it is loaded, or
    // with false if it isn't
    Promise.resolve(
        atom.packages.isPackageLoaded('tree-view') &&
        atom.packages.activatePackage('tree-view')
    ).then(treeViewPkg => {
        console.info(treeViewPkg.mainModule)
        const treeViewEl = treeViewPkg.mainModule.treeView.element

        // do nothing if the tree view packages isn't loaded
        if (!treeViewPkg) {
            atom.notifications.addError('tree-view package not loaded', {
                detail: 'tree-view-git-branch-fix requires the tree view package to be loaded',
            })
            return
        }

        disposables = new CompositeDisposable(
            atom.project.onDidChangePaths(() =>
                update(treeViewEl)
            ),

            atom.commands.add('atom-workspace', 'tree-view-git-branch-fix:reload', () =>
                update(treeViewEl)
            ),

            atom.config.onDidChange('tree-view-git-branch-fix.location', () =>
                update(treeViewEl)
            ),

            atom.config.onDidChange('tree-view-git-branch-fix.separator', () =>
                update(treeViewEl)
            )
        )

        update(treeViewEl)
    }).catch(error =>
        console.error(error.message, error.stack)
    )
}

function deactivate() {
    disposables.dispose()
    disposables = null
}

export {
    activate,
    deactivate,
    config,
}
