# The brief and the concept generator

Two modes. With a structured question tool (Claude Code `AskUserQuestion`: up to four
questions per call, two to four options each, recommended option first and marked), run the
brief as two calls of four questions. Without one (Codex, Gemini CLI, Cursor, plain chat),
print the block below as a numbered list with lettered options and a default in brackets, and
accept terse answers such as `1b 2a 3c 4d`. Ask in the user's language. Never ask what you can
infer; confirm the inference instead.

## Block A: what and where

1. **Message.** Free text. "In one sentence, what should the viewer understand or feel? Give
   me every phrase, name, date and link that must appear on screen exactly."
2. **Where it plays.** a) chat or messenger b) YouTube or a website c) Instagram, TikTok,
   Reels, Stories d) a screen at an event or a presentation. Default: a.
3. **Format.** a) 16:9 horizontal [default for a, b, d] b) 9:16 vertical [default for c]
   c) 1:1 square d) 4:5 portrait.
4. **Length.** a) 10–15 s, one idea b) 20–25 s [default] c) 30–40 s, a small story
   d) 45–60 s, only with a strong reason. Every extra scene costs a bar; long videos of a
   single message feel longer than they are.

## Block B: how

5. **Tone.** a) playful b) deadpan, ironic [default for questions and shout-outs]
   c) warm, sincere [default for greetings] d) technical, precise e) epic f) dark.
6. **Style.** a) let me propose three concepts [default] b) a family from `styles.md`
   (name it) c) match a reference the user names, in spirit not in assets.
7. **Assets.** "Do you have photos, logos, screenshots or a face that should appear? Put the
   files into the project folder; I cannot save an image from the chat. If a real person
   appears, confirm you have the right to use their likeness." Options: a) none, all
   procedural [default] b) photo of a person (posterized portrait) c) logo or mark (I will
   redraw it as vectors from the file) d) screenshots (redrawn as stylised UI, not pasted).
8. **Sound.** a) synthesized soundtrack [default] b) no sound c) leave room for the user's
   track, then ask the BPM d) voice-over later, so leave gaps under the text.

## Block C: only when relevant

9. **Deliverables.** a) MP4 only [default] b) plus a vertical cut c) plus a GIF for chats
   d) plus a poster frame e) plus two or three seed variations of a key frame f) the cover as the
   first frame of the MP4, for feeds that show frame 0 as the preview (often asked together with d).
10. **Quality and deadline.** a) quick draft: fewer scenes, 1280 px, no sound b) final
    [default]. A draft is a legitimate deliverable when the user wants to see direction first.
11. **Avoid.** Colours, clichés, brands, jokes that would land badly.

"You decide" means: take every default, list the defaults you took in one line, continue.

## Intake of assets

- Files go into the project folder. Name them plainly (`photo.jpg`, `logo.png`).
- Photos: any size above 600 px on the short side; frontal, evenly lit faces trace best.
- Logos: you redraw them as paths in code; the file is a reference for you to look at, it
  never enters the HTML.
- Third-party likeness: the user confirms rights before the video leaves the machine.
  If the video is going to be public, say so in the same sentence.
- Until a file arrives, build the scene on the synthetic placeholder and say it is a
  placeholder in every message that shows it.

## The concept generator

Three concepts, always, before code. One per angle:

| Angle | Question you ask yourself | Typical systems |
|---|---|---|
| Literal | What is the subject, shown plainly and beautifully? | flat vector, poster type, paper cutout |
| Metaphor | What situation is this, and which familiar visual system means that situation? | test card = waiting, blueprint = plan, terminal = process, weather map = forecast, scoreboard = competition, boarding pass = departure |
| Genre parody | Which format would report this event with a straight face? | news bulletin, teletext, arcade attract mode, airline safety card, nature documentary, infomercial, 90s TV ad, product keynote |

Any angle can be told as one take: when the logline is a journey or a growth (a line that
draws a life, a flight from a detail out to a landscape), the concept can be one continuous
world instead of cut scenes (`world.md`). Say so in the concept; it is built and changed
differently.

For each concept produce:

- **Name**: two words the user can say back.
- **Logline**: one sentence, present tense, what the viewer sees from first to last frame.
- **Visual system**: the style family from `styles.md`, a three-colour palette, the type.
- **Key scenes**: three to five, in order, each one line, each readable as a still.
- **Ending**: the final image and the last text on screen.
- **Sound sketch**: three cues.
- **Why it fits**: one sentence tied to the message.
- **Risk**: what could make it fall flat, and the mitigation.

Present as a table with the three names as columns and the rows above, then one paragraph
with your recommendation and why. Ask one question: which one, or a mix. If the user mixes,
restate the mixed concept in the same format before the storyboard.

### Worked example

Message: "Sergey, when do we get the stream about paperclip?" Tone: deadpan. Length: 30–40 s.

| | No Signal | Blueprint of a Stream | Paperclip News |
|---|---|---|---|
| angle | metaphor: waiting for a broadcast | metaphor: a plan that exists only on paper | genre parody: breaking news |
| system | retro TV: test card, snow, teletext, oscilloscope | blueprint: white lines on deep blue, dimension arrows, stamps | news: lower thirds, ticker, map, "LIVE" that never lights |
| key scenes | TV powers on, snow, NO SIGNAL; test card with a day counter; countdown that breaks; teletext asks the question; oscilloscope traces a paperclip, "streams found: 0"; signal locks onto Sergey's portrait; TV powers off | title block; a paperclip drawn as a part with dimensions; a Gantt bar labelled STREAM with no end date; a stamp "APPROVED" that never lands; portrait as a technical drawing | studio bumper; anchor lower third; ticker with the question; a map with one empty dot; portrait in a "wanted" frame; "we return after the break" |
| ending | screen collapses to a dot, "waiting for the stream" | drawing rolls up, "revision 0" | ticker keeps running over black |
| sound | hum, hiss, 1 kHz tone, beeps, beat on the question, thunk | pencil scratches, paper, a metronome | news sting, typewriter, drum roll that stops |
| risk | too much noise on screen; keep text large | can look cold; add one moving joke | parody needs precise typography; keep one font |

Recommendation: No Signal, because the joke is the situation itself and every scene of a TV
that shows nothing restates the question without words.

## Storyboard sign-off

After the pick, fill the storyboard table (`assets/storyboard.md`), state the total and the
second of the main event, and ask one yes-or-no question. Then build. Do not ask again until
the first contact sheet.
