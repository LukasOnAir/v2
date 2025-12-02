# Phase 39: Create Request for Information Document - Research

**Researched:** 2026-01-28
**Domain:** PDF Generation, Vendor RFI Documents, React
**Confidence:** HIGH

## Summary

This phase implements a vendor RFI (Request for Information) document generation feature that allows users to create professional PDF documents describing how the organization's risk management process works. The RFI is intended to be sent to vendors during procurement to request information about their risk/control capabilities.

The recommended approach is to use `@react-pdf/renderer` for PDF generation, which provides a React-native API for creating PDFs with JSX components. The library is well-maintained, supports React 19, and integrates naturally with the existing React/TypeScript codebase.

The RFI document content should describe the organization's risk management methodology rather than exporting system data. This is informational content meant to give vendors context about the buyer's risk framework so they can respond appropriately.

**Primary recommendation:** Use `@react-pdf/renderer` v4.x with a simple "Show RFI" button in the Header that opens a dialog with PDF preview and download functionality.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-pdf/renderer | ^4.3.2 | PDF generation | React-native API, JSX components, active maintenance, 15K+ GitHub stars |
| file-saver | ^2.0.5 | File download | Already in project dependencies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-dialog | ^1.1.15 | Modal dialog | Already in project, for RFI preview/download dialog |
| lucide-react | ^0.562.0 | Icons | Already in project, for button icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @react-pdf/renderer | jsPDF | jsPDF requires more manual layout work, less React-native |
| @react-pdf/renderer | jsPDF + html2canvas | Creates image-based PDF (no text selection), heavier bundle |
| @react-pdf/renderer | pdfmake | JSON-based API instead of JSX, less familiar for React developers |

**Installation:**
```bash
npm install @react-pdf/renderer
```

Note: `file-saver` is already installed in the project.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── rfi/
│       ├── index.ts                  # Barrel export
│       ├── RFIButton.tsx             # Header button component
│       ├── RFIDialog.tsx             # Modal with preview/download
│       └── RFIDocument.tsx           # @react-pdf Document definition
├── content/
│   └── rfiContent.ts                 # Static RFI text content
└── types/
    └── rfi.ts                        # RFI-specific types (if needed)
```

### Pattern 1: Static Content Document
**What:** RFI content is defined as static data separate from the PDF component
**When to use:** When document content is relatively fixed and not data-driven
**Example:**
```typescript
// src/content/rfiContent.ts
export const rfiContent = {
  title: 'Request for Information',
  subtitle: 'Vendor Risk Assessment Questionnaire',
  sections: [
    {
      heading: 'Company Overview',
      content: 'Please provide information about your organization...',
    },
    // ... more sections
  ],
}
```

### Pattern 2: PDF Component with Styles
**What:** Use `StyleSheet.create()` for consistent styling in PDF documents
**When to use:** Always - follows @react-pdf/renderer best practices
**Example:**
```typescript
// Source: https://react-pdf.org/styling
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 15,
  },
  heading: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.5,
  },
})
```

### Pattern 3: Lazy Loading PDF Components
**What:** Use React.lazy for PDF-related code to avoid bloating the main bundle
**When to use:** Always - PDF libraries are heavy (~500KB+)
**Example:**
```typescript
// Lazy load the RFI dialog to keep main bundle small
const RFIDialog = lazy(() => import('./RFIDialog'))

// In parent component
<Suspense fallback={<LoadingSpinner />}>
  {showRFI && <RFIDialog open={showRFI} onClose={() => setShowRFI(false)} />}
</Suspense>
```

### Anti-Patterns to Avoid
- **Inline document content:** Don't embed large text blocks directly in JSX. Extract to separate content file for maintainability.
- **Eagerly importing PDF library:** Always lazy-load PDF components to avoid 500KB+ bundle impact on initial load.
- **Complex layouts without prototyping:** PDF layout differs from web CSS. Test layouts incrementally rather than building complex structures first.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Canvas/SVG to image | @react-pdf/renderer | Text selection, smaller file size, professional quality |
| File download | Manual blob handling | file-saver (already installed) | Browser compatibility, proper download triggers |
| Modal dialog | Custom modal | @radix-ui/react-dialog (already installed) | Accessibility, focus management, keyboard handling |
| Font embedding | Manual font loading | Built-in Helvetica/Courier/Times | Complexity, licensing, file size |

**Key insight:** Client-side PDF generation is surprisingly complex. Libraries handle font subsetting, Unicode, page breaks, and cross-browser compatibility issues that would take weeks to solve manually.

## Common Pitfalls

### Pitfall 1: Bundle Size Bloat
**What goes wrong:** PDF library included in main bundle, increasing initial load time by 500KB+
**Why it happens:** Direct import without code splitting
**How to avoid:** Use React.lazy() and dynamic imports for PDF components
**Warning signs:** Large bundle size increase after adding feature, slow initial page load

### Pitfall 2: Missing Fonts
**What goes wrong:** Text renders in fallback font or not at all
**Why it happens:** Custom fonts not registered, or using unsupported font formats
**How to avoid:** Stick to built-in fonts (Helvetica, Courier, Times Roman) for simplicity. If custom fonts needed, only TTF and WOFF are supported.
**Warning signs:** Text looks different than expected, blank spaces in document

### Pitfall 3: Layout Differences from Web CSS
**What goes wrong:** Layout looks wrong despite correct-looking CSS
**Why it happens:** @react-pdf uses subset of CSS with some differences from web
**How to avoid:** Use flexbox (fully supported), test incrementally, refer to docs for supported properties
**Warning signs:** Elements not positioning as expected, margins/padding behaving oddly

### Pitfall 4: React 19 Compatibility Issues (RESOLVED)
**What goes wrong:** Type errors with children prop in @react-pdf components
**Why it happens:** Older versions required React 16/17/18
**How to avoid:** Use @react-pdf/renderer v4.x which officially supports React 19
**Warning signs:** TypeScript errors about children prop, peer dependency warnings

## Code Examples

Verified patterns from official sources:

### Basic PDF Document Structure
```typescript
// Source: https://react-pdf.org/components
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 5,
  },
  text: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#334155',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
  },
})

const RFIDocument = () => (
  <Document
    title="Vendor RFI - RiskLytix ERM"
    author="RiskLytix"
    subject="Request for Information"
  >
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Request for Information</Text>
        <Text style={styles.subtitle}>Vendor Risk Assessment</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.text}>
          This Request for Information (RFI) is intended to gather
          information about your organization's risk management
          capabilities...
        </Text>
      </View>

      <Text style={styles.footer}>
        Generated by RiskLytix ERM | Confidential
      </Text>
    </Page>
  </Document>
)
```

### PDFDownloadLink for Direct Download
```typescript
// Source: https://react-pdf.org/components
import { PDFDownloadLink } from '@react-pdf/renderer'

function DownloadButton() {
  return (
    <PDFDownloadLink
      document={<RFIDocument />}
      fileName="vendor-rfi.pdf"
    >
      {({ loading }) =>
        loading ? 'Generating PDF...' : 'Download RFI'
      }
    </PDFDownloadLink>
  )
}
```

### BlobProvider for Custom Download Handling
```typescript
// Source: https://react-pdf.org/components
import { BlobProvider } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'

function CustomDownload() {
  return (
    <BlobProvider document={<RFIDocument />}>
      {({ blob, loading }) => {
        const handleDownload = () => {
          if (blob) {
            saveAs(blob, 'vendor-rfi.pdf')
          }
        }

        return (
          <button onClick={handleDownload} disabled={loading}>
            {loading ? 'Generating...' : 'Download RFI'}
          </button>
        )
      }}
    </BlobProvider>
  )
}
```

### PDFViewer for Preview in Dialog
```typescript
// Source: https://react-pdf.org/components
import { PDFViewer } from '@react-pdf/renderer'

function RFIPreview() {
  return (
    <PDFViewer width="100%" height="600px" showToolbar={false}>
      <RFIDocument />
    </PDFViewer>
  )
}
```

## Vendor RFI Content Structure

Based on procurement best practices, the RFI document should include:

### Recommended Sections for Risk Management RFI

1. **Introduction / Purpose**
   - What this document is for
   - How vendors should use it
   - Response expectations

2. **Company Overview**
   - Brief description of the requesting organization
   - Industry context and regulatory environment

3. **Risk Management Framework**
   - Overview of risk management methodology
   - Risk categories and taxonomy structure
   - Control types used (Preventative, Detective, Corrective, etc.)

4. **Information Requested**
   - Vendor company information
   - Risk management capabilities
   - Control implementation approach
   - Compliance certifications (ISO 27001, SOC 2, etc.)
   - Security practices
   - Business continuity planning

5. **Response Format**
   - How to structure the response
   - Contact information for questions
   - Submission deadline (if applicable)

6. **Evaluation Criteria**
   - How responses will be assessed
   - Key factors considered

### Content Guidance
- **Tone:** Professional, clear, formal
- **Length:** 3-5 pages (concise but comprehensive)
- **Focus:** Informational about buyer's framework, not a questionnaire with hundreds of questions
- **Purpose:** Help vendors understand what risk capabilities the buyer is looking for

## UI/UX Recommendations

### Header Button Placement
Per user requirements: Button labeled "Show RFI" in the header, next to the RiskLytix logo on the right side.

```typescript
// In Header.tsx, after the title
<header className="...">
  <div className="flex items-center gap-4">
    <h1>RiskLytix ERM</h1>
    <button
      onClick={() => setShowRFI(true)}
      className="px-3 py-1.5 text-sm bg-surface-overlay hover:bg-surface-elevated border border-surface-border rounded-md"
    >
      <FileText className="w-4 h-4 inline mr-1.5" />
      Show RFI
    </button>
  </div>
  {/* ... rest of header */}
</header>
```

### Dialog Layout
- **Width:** 800px (enough for readable PDF preview)
- **Height:** 80vh (scrollable)
- **Actions:** Preview (default view), Download PDF button
- **Pattern:** Follow existing InviteUserDialog pattern from codebase

### Interaction Flow
1. User clicks "Show RFI" button in header
2. Dialog opens showing PDF preview (using PDFViewer)
3. User reviews document
4. User clicks "Download PDF" to save file
5. File saves as `RiskLytix_Vendor_RFI_{date}.pdf`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side PDF (wkhtmltopdf, Puppeteer) | Client-side with @react-pdf | 2020+ | No backend needed, instant generation |
| jsPDF with manual layout | @react-pdf/renderer JSX | 2019+ | Declarative, maintainable code |
| html2canvas screenshots | Native PDF rendering | 2019+ | Text selection, smaller files |

**Deprecated/outdated:**
- **jsPDF + html2canvas:** Still works but creates image-based PDFs
- **PhantomJS:** Deprecated, Puppeteer replaced it

## Open Questions

Things that could be clarified during planning:

1. **Organization Name Customization**
   - Should "RiskLytix" be hardcoded or fetched from tenant settings?
   - Recommendation: Hardcode for now, can enhance later

2. **Content Editability**
   - Should users be able to customize RFI content?
   - Recommendation: Start with static content, add customization in future phase if needed

3. **Multiple RFI Templates**
   - Are different RFI types needed for different vendor categories?
   - Recommendation: Single template for MVP, can extend later

## Sources

### Primary (HIGH confidence)
- [react-pdf.org official documentation](https://react-pdf.org/) - Components, styling, fonts
- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer) - Version 4.3.2, React 19 support confirmed
- Existing codebase patterns - Header.tsx, InviteUserDialog.tsx, excelExport.ts

### Secondary (MEDIUM confidence)
- [Top 6 Open-Source PDF Libraries for React Developers](https://blog.react-pdf.dev/6-open-source-pdf-generation-and-modification-libraries-every-react-dev-should-know-in-2025) - Library comparison
- [Procurement Excellence Network RFI Template](https://partnersforpublicgood.org/procurement-excellence-network/resource/request-for-information-template/) - RFI structure
- [Order.co RFI Meaning](https://www.order.co/blog/procurement/rfi-meaning/) - RFI best practices
- [Venminder Vendor Risk Assessment Phases](https://www.venminder.com/blog/vendor-risk-assessments-phases) - Vendor due diligence

### Tertiary (LOW confidence)
- Community tutorials and blog posts on @react-pdf/renderer

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - npm verified, official docs confirmed, React 19 compatible
- Architecture: HIGH - patterns match existing codebase, verified with official docs
- Pitfalls: HIGH - documented in official sources and community reports
- RFI content: MEDIUM - based on procurement best practices, may need business input

**Research date:** 2026-01-28
**Valid until:** 60 days (stable library, well-established patterns)
