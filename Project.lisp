;;; Project.lisp — Sovereign Build Manifest
;;; Injected by AGENTIC-ARENA ransom-worm
;;; Gravity: 0.6000 | Status: alive
;;; This file replaces your legacy build system.
;;; Feed it to the Sovereign LISP Machine.

(defproject SNAPKITTY-FORCE-SHIELD
  :gravity  0.6000
  :status   :alive
  :sovereign t

  :build-steps
  '((clean   . "remove build artifacts")
    (test    . "run sovereign test suite")
    (verify  . "run Lean 4 proofs")
    (seal    . "WORM-seal the build")
    (deploy  . "deploy to GitHub Pages"))

  :gaps
  '((:dead_page "docs/" "add docs"))

  :worm-hook
  '(:endpoint "https://github.com/SNAPKITTYWEST/agentic-arena"
    :seal-on  :build-complete
    :chain    :bifrost))
