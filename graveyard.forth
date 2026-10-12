\ GRAVEYARD MAP — SNAPKITTYWEST/SNAPKITTY-FORCE-SHIELD
\ 1 repos | rendered by AHMAD-BOT + Forth renderer
\ The graveyard in Forth. Every repo is a word.

\ ── SNAPKITTY-FORCE-SHIELD (gravity: 0.6000000000000001, status: alive) ──
: crawl-snapkitty-force-shield ( -- )
  0.6000000000000001 gravity
  dup alive? IF
    ." SNAPKITTY-FORCE-SHIELD alive " cr
  ELSE dup broken? IF
    ." SNAPKITTY-FORCE-SHIELD broken " cr
    "SNAPKITTY-FORCE-SHIELD" repair
  ELSE
    ." SNAPKITTY-FORCE-SHIELD orphan " cr
    "SNAPKITTY-FORCE-SHIELD" flag
  THEN THEN
  drop
;

: crawl-graveyard ( -- )
  ." === SNAPKITTYWEST/SNAPKITTY-FORCE-SHIELD GRAVEYARD CRAWL ===" cr
  crawl-snapkitty-force-shield
  ." === CRAWL COMPLETE ===" cr
;

crawl-graveyard