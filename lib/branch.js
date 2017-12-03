'use babel'
/* global atom */
import { name as packageName } from '../package'
import { CompositeDisposable } from 'atom'
import { addEventListener } from './utils.js'

document.registerElement('tree-view-git-branch-fix', {
    extends: 'li',
    prototype: Object.assign(Object.create(HTMLElement.prototype), {
        createdCallback() {
            this.classList.add('list-item', 'entry', 'file')

            this.label = this.appendChild(document.createElement('span'))
            this.label.classList.add('name', 'icon')
        },

        initialize({ icon, ref, repository }) {
            this.repository = repository
            this.setIcon(icon)
            this.setRef(ref)
            this.observeConfig()

            this.disposables = new CompositeDisposable(
                addEventListener(this, 'click', event => {
                    event.stopPropagation()
                    if (this.openActionMatch(event)) {
                        this.checkout()
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

        setRef(ref) {
            const [, shortRef] = ref.match(/refs\/heads\/(.+)/)

            this.setAttribute('data-ref', ref)
            this.label.innerHTML = shortRef

            if (shortRef != this.repository.getShortHead()) {
                this.classList.add('status-ignored')
            }
        },

        checkout(e) {
            const ref = this.getAttribute('data-ref')

            if (this.repository.checkoutReference(ref)) {
                atom.notifications.addSuccess(`Checkout ${ref}.`)

                for (const element of Array.from(this.parentNode.childNodes)) {
                    element.classList.add('status-ignored')
                }
                this.classList.remove('status-ignored')
            } else {
                atom.notifications.addError(`Checkout of ${ref} failed.`)
            }
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
