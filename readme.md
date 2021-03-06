## tree-view-git-branch-fix

Currently the package [tree-view-git-branch](https://atom.io/packages/tree-view-git-branch) is not working in my atom of version 1.23.0-beta1.

I looked the repo of that package and found it was not in development for 2 years.

So I copied its code and fix the bug.

I'm new to this package, so I only fix the basic features, only tested with `location` setting to top.

![demo](https://raw.githubusercontent.com/yubaoquan/yubaoquan.github.io/master/images/tree-view-git-branch/tree-view-git-branch-min.gif)

### New Feature

#### checkout remote branch

- This feature is learned from the package [git-plus](https://atom.io/packages/git-plus), thanks to its author @akonwi
- This feature is experimental, when the remote branch has the corresponding local branch, checkout will fail
- When checkout succeed, the tree view will automatically scroll to the new local branch



###

1. show the branch branch list
2. switch the branch

### Change Log:

#### 0.1.0

1. initialize

#### 0.2.0

1. Make toggle real toggle: when branch list is show, toggle will hide it, vise versa
2. Configure single click or double click on branch list to expand or collapse it
2. Configure single click or double click on branch item to switch to it
3. Add configuration option: activate on startup

#### 0.2.1

1. Update readme: add a lost link

#### 0.3.0

1. Add configure option `Show Remote`
2. Checkout remote branch and auto track

#### 0.3.1

1. Fix `location: before/inside` not working when opening multiple projects in a window

#### 0.3.2

1. Fix `location: before/inside` not working in windows OS
2. Fix wrong render of branch items in windows OS

#### 0.3.3

1. Add an alert when user is opening a link (generated by ln or ln -s) to a git project,  tell user opening the link will cause project root not found exception when the location is not set to top.

#### 0.3.4

1. Fix can't find project root in link project.
2. Change notify to confirm modal, because notify has no delay option.
3. Add copy variable log feature for user to report bug.

#### 0.3.5

1. Move clipboardy from devDependencies to dependencies.

#### 0.3.6

1. Change way to get the project root, this will fix some bugs when add or remove project folder

#### 0.3.7

1. Fix exception: e.stopPropagation is not a function

### TODO:

1. Search branch name and scroll the screen to it.
