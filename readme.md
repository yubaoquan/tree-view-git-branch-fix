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



### Fix:

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

### 0.2.1

1. Update readme: add a lost link

### 0.3.0

1. Add configure option `Show Remote`
2. Checkout remote branch and auto track

### 0.3.1

1. Fix `location: before/inside` not working when opening multiple projects in a window

### TODO:

1. Search branch name and scroll the screen to it.
