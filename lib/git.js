'use babel'
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS201: Simplify complex destructure assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

/* global atom */

import { BufferedProcess } from 'atom'
import notifier from './notifier'
import os from 'os'
import fs from 'fs'

async function getBranches(includeRemote, repo) {
    const workingDirectory = repo.getWorkingDirectory()
    const localBranches = await getLocalBranches(workingDirectory)
    const remoteBranches = await getRemoteBranches(workingDirectory)
    // const result = includeRemote ? localBranches.concat(remoteBranches) : localBranches
    // return result.filter(line => line && line.trim())
    return {
        local: localBranches.map(line => line.trim()),
        remote: remoteBranches.map(line => line.trim()),
    }
}

async function getLocalBranches(workingDirectory) {
    try {
        const data = await cmd(['branch', '--no-color'], { cwd: workingDirectory }) || ''
        return data.split(os.EOL).filter(line => line && line.trim())
    } catch (e) {
        console.error('Error getting local branches', e)
        return []
    }
}

async function getRemoteBranches(workingDirectory) {
    try {
        const data = await cmd(['branch', '-r', '--no-color'], { cwd: workingDirectory })
        return data.split(os.EOL).filter(line => line && line.trim())
    } catch (e) {
        console.error('Error getting remote branches', e)
        return []
    }
}

async function checkoutBranch(name, isRemote, repo) {
    const workingDirectory = repo.getWorkingDirectory()
    const args = isRemote ? ['checkout', name, '--track'] : ['checkout', name]
    return new Promise((resolve, reject) => {
        cmd(args, { cwd: workingDirectory })
            .then(message => {
                notifier.addSuccess(message)
                console.info(message)
                atom.workspace.getTextEditors().forEach(editor => {
                    try {
                        const path = editor.getPath()
                        if (path && path.toString && !fs.exists(path.toString())) {
                            editor.destroy()
                        }
                    } catch (error) {
                        notifier.addWarning('There was an error closing windows for non-existing files after the checkout. Please check the dev console.')
                        console.error(error)
                    }
                })
                refreshRepo(repo)
                resolve()
            })
            .catch(e => {
                notifier.addError(e)
                reject(e)
                console.error('chekout fail', e)
            })
    })
}

function refreshRepo(repo) {
    if (repo) {
        repo.refreshIndex()
        repo.refreshStatus()
    }
}

function cmd(args, options, param) {
    if (options == null) {
        options = { env: process.env }
    }
    if (param == null) {
        param = {}
    }
    const { color } = param
    return new Promise(function(resolve, reject) {
        let left
        let output = ''
        if (color) {
            args = ['-c', 'color.ui=always'].concat(args)
        }
        const process = new BufferedProcess({
            command: (left = atom.config.get('git-plus.general.gitPath')) != null ? left : 'git',
            args,
            options,
            stdout(data) {
                return output += data.toString()
            },
            stderr(data) {
                return output += data.toString()
            },
            exit(code) {
                if (code === 0) {
                    return resolve(output)
                } else {
                    return reject(output)
                }
            },
        })
        return process.onWillThrowError(function(errorObject) {
            notifier.addError('Unable to locate the git command. Please ensure process.env.PATH can access git.')
            return reject(`Couldn't find git`)
        })
    })
}

export { getBranches, checkoutBranch }
