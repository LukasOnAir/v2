/**
 * Generates hierarchical IDs for a tree structure using materialized path algorithm.
 *
 * IDs are position-based (1-indexed) and nested with dot notation:
 * - Root items: "1", "2", "3"
 * - First level children: "1.1", "1.2", "2.1"
 * - Deeper levels: "1.1.1", "1.2.3", etc.
 *
 * This function is pure and should be called after ANY structure change
 * (add, delete, move, reorder) to recalculate all IDs from position.
 *
 * @param items - Array of items with optional children
 * @param parentPath - Parent's hierarchical ID (used in recursion)
 * @returns Items with hierarchicalId added to each node
 */
export function generateHierarchicalIds<T extends { children?: T[] }>(
  items: T[],
  parentPath?: string
): (T & { hierarchicalId: string })[] {
  return items.map((item, index) => {
    const position = index + 1
    const hierarchicalId = parentPath ? `${parentPath}.${position}` : `${position}`

    const result: T & { hierarchicalId: string } = {
      ...item,
      hierarchicalId,
    }

    if (item.children && item.children.length > 0) {
      result.children = generateHierarchicalIds(item.children, hierarchicalId) as T[]
    }

    return result
  })
}
