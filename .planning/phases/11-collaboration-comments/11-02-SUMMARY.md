---
phase: 11-collaboration-comments
plan: 02
status: complete
duration: 4 min
---

# Plan 11-02 Summary: Comment UI Components for ControlPanel

## What Was Built

1. **CommentForm.tsx** (77 lines)
   - Form for adding new comments or replies
   - Props: entityType, entityId, parentId, onSubmit, onCancel
   - Uses local state for content, commits to collaborationStore via addComment
   - Dynamic placeholder: "Write a reply..." vs "Add a comment..."
   - Submit button text: "Reply" vs "Comment" based on parentId
   - Ctrl+Enter keyboard shortcut for submit

2. **CommentThread.tsx** (177 lines)
   - Recursive component for rendering threaded comments
   - MAX_DEPTH = 3 for visual sanity
   - CommentItem sub-component handles:
     - Author badge (accent for Risk Manager, blue for Control Owner)
     - Relative timestamp via formatDistanceToNow
     - "[edited]" indicator for edited comments
     - Reply, Edit, Delete action buttons
     - In-place editing with save/cancel
     - Delete confirmation with cascade warning
   - Permission checks:
     - canEdit: own comments only
     - canDelete: own comments OR Risk Manager (can moderate)
   - Visual indentation: ml-6 pl-4 border-l for nested levels

3. **CommentsSection.tsx** (79 lines)
   - Collapsible section following ControlTestSection pattern
   - Header shows MessageCircle icon, "Comments", and count badge
   - Expand/collapse with ChevronDown/ChevronRight
   - Displays CommentThread for top-level comments (parentId: null)
   - "Add Comment" button toggles CommentForm

4. **ControlPanel.tsx Integration**
   - Imported CommentsSection
   - Added `<CommentsSection entityType="control" entityId={control.id} />` after RemediationSection

## Verification

- [x] CommentForm compiles without errors
- [x] CommentThread handles threading recursively
- [x] CommentsSection follows collapsible pattern
- [x] ControlPanel renders CommentsSection for each control
- [x] npx tsc --noEmit passes

## Files Modified

| File | Lines | Purpose |
|------|-------|---------|
| src/components/rct/CommentForm.tsx | 77 | New comment form component |
| src/components/rct/CommentThread.tsx | 177 | Recursive threaded display |
| src/components/rct/CommentsSection.tsx | 79 | Collapsible section wrapper |
| src/components/rct/ControlPanel.tsx | +7 | Integration |

## Key Patterns

- Recursive CommentThread for unlimited theoretical depth (capped at MAX_DEPTH=3)
- Permission-based action visibility (edit own, delete own or as Risk Manager)
- Local state for editing, store updates on save only
- formatDistanceToNow for human-readable timestamps

---
*Completed: 2026-01-22*
