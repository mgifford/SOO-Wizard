# Social Media Optimization

## Current Implementation

The SOO Wizard includes comprehensive social media meta tags in [index.html](index.html):

### Open Graph (Facebook, LinkedIn)
- `og:type` - website
- `og:url` - Canonical URL
- `og:title` - Clear, descriptive title
- `og:description` - Concise value proposition
- `og:image` - Preview image (needs to be created)

### Twitter Cards
- `twitter:card` - Large image format
- `twitter:title` / `twitter:description` / `twitter:image`
- Matches Open Graph content for consistency

### SEO Basics
- Page title optimized for search
- Meta description under 160 characters
- Keywords meta tag
- Canonical URL to prevent duplicate content issues

## What You Need to Add

### 1. Social Preview Image (Required)

Create `social-preview.png` in the root directory:
- **Dimensions:** 1200x630px (Facebook/LinkedIn/Twitter optimal)
- **File size:** Under 1MB
- **Content suggestions:**
  - Project name "SOO Wizard"
  - Tagline: "Outcome-Focused Federal Procurement"
  - Visual: USWDS-styled interface screenshot or graphic
  - Logo if available

**Tools:**
- Canva (templates for social media images)
- Figma (design from scratch)
- Screenshot + image editor

### 2. Favicon (Optional but Recommended)

Add to `<head>`:
```html
<link rel="icon" type="image/png" sizes="32x32" href="./favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="./favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png">
```

### 3. robots.txt (Optional)

Create `robots.txt` in root:
```
User-agent: *
Allow: /
Sitemap: https://mgifford.github.io/SOO-Wizard/sitemap.xml
```

### 4. Structured Data (Optional - Advanced)

Add JSON-LD structured data for better search indexing:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "SOO Wizard",
  "description": "Create outcome-focused Statements of Objectives for federal procurement",
  "url": "https://mgifford.github.io/SOO-Wizard/",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Any (web-based)",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
</script>
```

## Testing Your Social Meta Tags

### Online Tools
1. **Facebook Debugger:** https://developers.facebook.com/tools/debug/
2. **Twitter Card Validator:** https://cards-dev.twitter.com/validator
3. **LinkedIn Post Inspector:** https://www.linkedin.com/post-inspector/
4. **Meta Tags Checker:** https://metatags.io/

### What to Check
- Image displays correctly (1200x630px)
- Title and description are complete
- No warnings about missing required fields
- Preview looks professional and clear

## Best Practices for Sharing

### When Posting on Social Media

**LinkedIn (Professional audience):**
- Emphasize federal procurement compliance, FAR alignment
- Target contracting officers, program managers
- Hashtags: #FederalProcurement #DigitalServices #AgileContracting

**Twitter/X:**
- Focus on outcomes over tasks, privacy-first approach
- Hashtags: #GovTech #Procurement #OpenSource
- Tag relevant government accounts (@USDS, @18F, etc.)

**GitHub:**
- Add topics to repository: `federal-procurement`, `government`, `accessibility`, `web-application`
- Complete "About" section with description and website link
- Add project to relevant GitHub Awesome Lists

### Sample Social Post

> 🎯 Introducing SOO Wizard - a free tool for creating outcome-focused Statements of Objectives (SOO) for federal digital services contracts.
>
> ✅ Built-in FAR compliance checking  
> ✅ Privacy-first (data stays in browser)  
> ✅ AI-assisted drafting (optional)  
> ✅ USWDS design system  
>
> Try it: https://mgifford.github.io/SOO-Wizard/
>
> #FederalProcurement #GovTech #OpenSource

## GitHub Repository Settings

### About Section
- **Description:** "Create outcome-focused Statements of Objectives (SOO) for federal digital services procurement"
- **Website:** https://mgifford.github.io/SOO-Wizard/
- **Topics:** federal-procurement, government, accessibility, web-application, performance-based-acquisition, uswds

### Social Preview
Upload `social-preview.png` to repository settings → Social preview

## Analytics (Optional)

Consider adding privacy-friendly analytics:
- **Plausible.io** - GDPR compliant, no cookies
- **GoatCounter** - Open source, privacy-focused
- Avoid Google Analytics (privacy concerns for federal tool)

Add to end of `<body>`:
```html
<script defer data-domain="mgifford.github.io" src="https://plausible.io/js/script.js"></script>
```

## Accessibility Note

All social media optimizations maintain WCAG 2.2 AA compliance:
- Meta tags don't affect user experience
- Images include alt text where applicable
- No tracking scripts that interfere with assistive technology
