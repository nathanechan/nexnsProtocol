# Invitation participation and promotion

Participation is independent of promotion. On the first successful participation only, an unbound non-creator arriving with a valid project referral is bound atomically with the new position. Direct participation remains unbound. Failed or cancelled actions do not bind. Existing relationships ignore subsequent referral URLs; direct participants may later bind via the explicit promotion flow.

New invited members have promotionEnabled=false. Binding alone does not unlock their invitation link. The Contribution page provides the optional Enable promotion action. Existing bound legacy snapshots without this field preserve prior invitation access. Referral validation requires an eligible promoter or the project creator, prevents self-referrals, cross-project referrals, replacement and cycles.

No invitation controls appear in the action area. The final participation confirmation includes the inviter. Removed the terminal header share arrow.

Validation: 257 unit tests, type/lint checks in production build, successful production build. Desktop and mobile browser verification covers invited participation, confirmation, bound without promotion, persistence after refresh, optional promotion unlock and no action-area invitation controls or horizontal overflow.
