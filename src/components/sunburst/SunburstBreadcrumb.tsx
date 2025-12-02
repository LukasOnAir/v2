interface BreadcrumbItem {
  /** Node UUID */
  id: string
  /** Display name */
  name: string
  /** Hierarchical ID format "1.2.3" */
  hierarchicalId: string
}

interface SunburstBreadcrumbProps {
  /** Path from root to current center */
  path: BreadcrumbItem[]
  /** Callback when clicking a breadcrumb item */
  onNavigate: (nodeId: string) => void
}

export function SunburstBreadcrumb({
  path,
  onNavigate,
}: SunburstBreadcrumbProps) {
  const isRootView = path.length === 0

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Sunburst navigation">
      {/* Root "All" item */}
      {isRootView ? (
        <span className="font-semibold text-primary">All</span>
      ) : (
        <button
          type="button"
          className="text-secondary hover:text-primary hover:underline transition-colors"
          onClick={() => onNavigate('root')}
        >
          All
        </button>
      )}

      {/* Path items */}
      {path.map((item, index) => {
        const isLast = index === path.length - 1
        const displayText = item.hierarchicalId
          ? `${item.hierarchicalId} ${item.name}`
          : item.name

        return (
          <span key={item.id} className="flex items-center gap-1">
            {/* Separator */}
            <span className="text-secondary mx-1" aria-hidden="true">
              &gt;
            </span>

            {/* Breadcrumb item */}
            {isLast ? (
              // Current item: bold, not clickable
              <span className="font-semibold text-primary truncate max-w-[200px]">
                {displayText}
              </span>
            ) : (
              // Previous items: clickable with hover underline
              <button
                type="button"
                className="text-secondary hover:text-primary hover:underline transition-colors truncate max-w-[200px]"
                onClick={() => onNavigate(item.id)}
              >
                {displayText}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
