'use babel'
/* global atom */
import { name as packageName } from '../package'
import { CompositeDisposable } from 'atom'
import { addEventListener } from './utils'
import { checkoutBranch } from './git'

document.registerElement('tree-view-git-branch-fix', {
    extends: 'li',
    prototype: Object.assign(Object.create(HTMLElement.prototype), {
        createdCallback() {
            this.classList.add('list-item', 'entry', 'file')

            this.label = this.appendChild(document.createElement('span'))
            this.label.classList.add('name', 'icon')
        },

        initialize({ icon, ref, repository, updateFn }) {
            this.repository = repository
            this.setIcon(icon)
            if (ref) {
                this.setRef(ref)
            }
            this.observeConfig()
            this.disposables = new CompositeDisposable(
                addEventListener(this, 'click', event => {
                    event.stopPropagation()
                    if (this.openActionMatch(event)) {
                        this.checkout(event, updateFn)
                    }
                })
            )
        },
        observeConfig() {
            atom.config.observe(`${packageName}.switchBranchAction`, value => {
                this.openAction = value
            })
        },

        openActionMatch(e) {
            return (this.openAction === 'single' && e.detail === 1)
                || (this.openAction === 'double' && e.detail === 2)
        },

        destroy() {
            this.disposables.dispose();
            [this.disposables, this.repository] = []
        },

        setIcon(icon) {
            if (!icon) {
                return
            }
            this.label.className.replace(/\bicon-[^\s]+/, `icon-${icon}`)
        },

        setRef(item) {
            const ref = item.ref
            const type = item.type
            const isCurrentBranch = ref.indexOf('* ') === 0
            const shortRef = isCurrentBranch ? ref.slice(2) : ref
            this.setAttribute('data-ref', shortRef)
            this.setAttribute('data-type', type)
            this.label.innerHTML = shortRef
            this.active = isCurrentBranch
            if (!isCurrentBranch) {
                this.classList.add('status-ignored')
            }
        },

        isActive() {
            return this.active
        },
        activate() {
            this.active = true
            this.classList.remove('status-ignored')
        },
        deactivate() {
            this.active = false
            this.classList.add('status-ignored')
        },

        checkout(e, updateFn) {
            if (this.active) {
                return
            }
            const ref = this.getAttribute('data-ref')
            const isRemote = this.getAttribute('data-type') === 'remote'
            checkoutBranch(ref, isRemote, this.repository)
                .then(() => {
                    if (isRemote) {
                        updateFn()
                    } else {
                        for (const element of Array.from(this.parentNode.childNodes)) {
                            element.deactivate()
                        }
                        this.activate()
                    }
                })
                .catch(e => {
                    console.error(e)
                    atom.notifications.addError(`Checkout of ${ref} failed.`)
                })
        },

        getPath() {
            const path = this.repository.getPath().replace('/.git', '')
            const ref = this.getAttribute('data-ref')
            return `${path}:git-branches/${ref}`
        },

        isPathEqual(path) {
            return path == this.getPath()
        },

    }),
})

export default function makeTreeViewGitBranch(...args) {
    const obj = document.createElement('li', 'tree-view-git-branch-fix')
    obj.initialize(...args)
    return obj
}
