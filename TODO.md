- [ ] Add form submission using Decap CMS or similar, to allow organizers to submit their events without needing a Github account or going through the issue/PR process.
- [ ] Fractional zoom levels cause gaps in the map tiles on Chromium. (this is a known issue with Leaflet, see: https://github.com/Leaflet/Leaflet/issues/3575)
- [ ] Add an optional total event count to the map view, showing the total number of events currently on the map. This can be added as a large badge in the top left corner of the map, with a tooltip that says "Total number of PCD events worldwide: XXX". Only show this badge if there are more than 10 events on the map.
- [ ] Label "new" on the map for events that were added in the last 7 days, to help users discover new events that were recently added to the map. This can be a small badge or icon next to the event name in the popup and in the side panel.
- [ ] Investigate translating the map labels to match the language selector.

## Later improvements (not for MVP):
- [ ] Add submission form with confirmation email when the event is approved and published.
- [ ] Allow organizers to edit their event information after it's published.