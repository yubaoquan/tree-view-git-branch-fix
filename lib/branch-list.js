'use babel'
/* global atom */
import { CompositeDisposable } from 'atom'
import makeTreeViewGitBranch from './branch.js'
import { addEventListener } from './utils.js'
import { name as packageName } from '../package'

document.registerElement('tree-view-git-branch-fix-list', {
    extends: 'li',
    prototype: Object.assign(Object.create(HTMLElement.prototype), {
        createdCallback() {
            this.classList.add('list-nested-item', 'entry', 'directory')

            this.header = this.appendChild(document.createElement('div'))
            this.header.classList.add('header', 'list-item')

            this.label = this.header.appendChild(document.createElement('span'))
            this.label.classList.add('name', 'icon')

            this.entriesByReference = {}
            this.entries = this.appendChild(document.createElement('ol'))
            this.entries.classList.add('list-tree', 'entries')
            this.collapse()

            this.disposables = new CompositeDisposable(
                addEventListener(this.header, 'click', e => this.toggleExpansion(e))
            )
        },

        initialize({ icon, title, repository, entries, updateFn }) {
            this.repository = repository
            this.setIcon(icon)
            this.setTitle(title)
            this.setEntries(entries, updateFn)
            this.observeConfig()
        },

        destroy() {
            this.remove()
            this.disposables.dispose();
            [this.disposables, this.repository] = []
        },

        setIcon(icon) {
            if (!icon) {
                return
            }
            this.label.className.replace(/\bicon-[^\s]+/, '')
            this.label.classList.add(`icon-${icon}`)
        },

        setTitle(title) {
            this.title = title
            this.label.innerHTML = title
        },

        setEntries({ local = [], remote = [] } = {}, updateFn) {
            for (const child of Array.from(this.entries.children)) {
                child.destroy()
            }

            this.entries.innerHTML = ''
            let referencesPlain = local.map(entry => ({ ref: entry, type: 'local' }))
            if (atom.config.get(`${packageName}.showRemote`)) {
                referencesPlain = referencesPlain.concat(
                    remote.map(entry => ({ ref: entry, type: 'remote' }))
                )
            }
            for (const ref of referencesPlain) {
                const child = makeTreeViewGitBranch({
                    repository: this.repository,
                    ref,
                    updateFn,
                })
                this.entries.appendChild(child)
                if (child.isActive()) {
                    child.scrollIntoView()
                }
            }
        },

        observeConfig() {
            atom.config.observe(`${packageName}.openBranchListAction`, value => {
                this.openAction = value
            })
        },

        expand() {
            if (!this.collapsed) {
                return
            }
            this.collapsed = false
            this.classList.add('expanded')
            this.classList.remove('collapsed')

            this.entries.style.display = ''
        },

        collapse() {
            if (this.collapsed) {
                return
            }
            this.collapsed = true
            this.classList.remove('expanded')
            this.classList.add('collapsed')

            this.entries.style.display = 'none'
        },
        openActionMatch(e) {
            return (this.openAction === 'single' && e.detail === 1)
                || (this.openAction === 'double' && e.detail === 2)
        },
        toggleExpansion(e) {
            e.stopPropagation()
            if (!this.openActionMatch(e)) {
                return
            }
            if (this.collapsed) {
                this.expand()
            } else {
                this.collapse()
            }
        },

        getPath() {
            return `${this.repository.getPath().replace('/.git', '')}:git-branches`
        },

        isPathEqual(path) {
            return path == this.getPath()
        },
    }),
})

export default function makeTreeViewGitBranchList(...args) {
    const obj = document.createElement('li', 'tree-view-git-branch-fix-list')
    if (args.length) {
        obj.initialize(...args)
    }
    return obj
}
