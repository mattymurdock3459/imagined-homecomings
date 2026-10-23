# Imagined Homecomings

A portable, buildless website for GitHub Pages. All ten original four-page
PDFs are included, in the requested order. No paid viewer, account, external
CDN, package installation, or build command is needed to run the website.

## Preview on your computer

Unzip the entire folder and open `index.html` in your browser. This local
preview uses images rendered from the original PDF pages; arrows, zoom,
expanded view, and the jump menu work without a server. The original PDFs
remain available through the ↗ button in each reader.

When hosted on GitHub Pages, the readers use the included PDF.js library
to render the original PDFs directly. Pre-rendered page images also provide
a fast first view and a fallback if PDF rendering is unavailable.

## Publish on GitHub Pages

1. Create a public GitHub repository for the project.
2. Upload the CONTENTS of this folder so `index.html`, `content.js`,
   `styles.css`, `app.js`, and `assets/` are at the repository root.
   Keep all the folders inside `assets/` intact. Include `.nojekyll` when
   using Git or GitHub Desktop; it is already in this package.
3. In the repository, open Settings → Pages.
4. Under Build and deployment, choose Deploy from a branch, select `main`,
   and select `/(root)`. Click Save.
5. GitHub displays the website address on that Pages settings screen after
   deployment finishes. The site works at both a project subpath and a
   custom domain because its asset links are relative.

If uploading in a browser, you can upload the small top-level files first
and then the `assets` folder. GitHub Desktop is also an option for uploading
the complete folder while preserving its directory structure.

## Add your writing — edit only content.js

Open `content.js` in GitHub and click its pencil icon. Add your text between
the empty backticks in each field, then commit your changes. GitHub Pages
will republish the site. Empty fields show small “forthcoming” placeholders.

At the top of `content.js`:

- `title` and `subtitle` control the hero text.
- `author` adds an optional name in the footer.
- `about.overview` is your project introduction.
- `about.methodology` is where you explain your approach.
- `about.reasoning` is where you explain the reasons for your choices.
- `closingThoughts` is the final section after all ten songs.

In each song entry:

- `title` is the displayed song title.
- `theme` is your theme tag.
- `commentary` is your interpretation of the song and its theme.
- `citation` is your preferred full citation, displayed in smaller type.
- `sourceUrl` is an optional full https:// archival-record link.
- Leave `id`, `pdf`, and `pageCount` alone unless replacing the document.

Use blank lines to separate paragraphs. Apostrophes and double quotation
marks can be typed normally. Avoid the backtick character inside your text;
it marks the beginning and end of a field. Keep the existing commas and
brackets. Plain text is displayed literally; HTML is not executed.

Example (illustrative only, not an interpretation supplied for this project):

    theme: `Your theme`,
    commentary: `Your first paragraph.

    Your second paragraph.`,
    citation: `Your full citation.`,
    sourceUrl: ``,

The order of song entries controls the order of the exhibition. The PDF
automatically alternates left, right, left, right on desktop. On smaller
screens, each title is followed by its reader, commentary, and citation.

## Reader controls

- Previous/Next turn the four pages independently for each song.
- Minus/plus change zoom; Fit returns to the full page.
- The expand button opens a larger reading view; Close or Escape returns.
- ↗ opens the original PDF in a new tab.
- With the page area focused, Left/Right turn pages and Home/End jump to
  the first/last page. Zoomed pages can be scrolled inside their frame.

## Images, documents, and dependencies

- The ten PDFs are unchanged copies of the selected uploaded documents.
- `assets/pages/` contains WebP renderings of their forty pages for initial
  loading and local preview. These are display aids, not replacement sources.
- The hero uses the supplied `Since I've Come Back to You` cover image.
  Its display is cropped with CSS to focus on the figures and exclude the
  printed headings; the underlying uploaded image is not retouched. It is
  a screenshot-resolution source, so a larger scan can improve sharpness.
- Hero movement is subtle and disabled for visitors who request reduced
  motion. Page navigation and content remain available without animation.
- PDF.js version 5.6.205 is included locally. Its Apache 2.0 license and the
  component licenses remain alongside it in `assets/vendor/`.

## Adjust the design

The first lines of `styles.css` define the site colors. The hero image and
its credit are in `index.html`; its visible crop is set by `.hero-art img`
in `styles.css`. Ordinary text changes only require `content.js`.

The project introduction, all theme tags and commentary, all song citation
fields, and closing thoughts are deliberately empty. No historical analysis
or theme assignments have been written on your behalf.

GitHub's official publishing guide:
https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
