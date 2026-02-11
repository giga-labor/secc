# ANALYTICS_SCHEMA.md

## Freeze

- `event_version`: `1.0.0`
- Any schema change must increment version.

## Common params

- `session_id`
- `event_version`
- `page_type`
- `page_path`
- `section_id`
- `device_type`
- `viewport_bucket` (`xs` `<360`, `sm` `360-767`, `md` `768-1023`, `lg` `>=1024`)
- `ts`

## Events

- `card_impression`
- `card_click`
- `paper_card_impression`
- `paper_card_click`
- `bridge_box_impression`
- `bridge_box_click`
- `paper_view`
- `paper_scroll_depth`
- `paper_read_time`
- `paper_exit`
- `related_paper_click`
- `ads_slot_view`

## Dedup rules

- Impression: visible >=50% for >=1s, max 1/session for same element key.
- Click: local debounce 320ms.
- Scroll: emit only at thresholds 25/50/75/100.
- Read time: heartbeat every 15s only if tab visible and recent interaction (<30s).
