'use babel'
/* globals atom */

export default {
    addError(title, detail) {
        atom.notifications.addError(title, { detail })
    },
    addSuccess(title) {
        atom.notifications.addSuccess(title)
    },
}
