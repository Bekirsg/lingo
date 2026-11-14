declare module '*/export-level-sheet.mjs' {
  export function generateCsvContent(wordsByLength: Record<number, string[]>): string
  export function exportLevelSheet(options?: { outDir?: string; publicDir?: string }): {
    counts: Record<number, number>
    total: number
    filePath: string
  }
}

declare module '*/build-levels.mjs' {
  export function normalizeLevelValue(raw: string | null | undefined): 'kolay' | 'orta' | 'zor'
  export function parseCsvRows(csvText: string): string[][]
  export function buildLevelsData(options?: {
    dataSrcDir?: string
    publicDir?: string
    outDir?: string
    writeFiles?: boolean
  }): {
    stats: Record<number, { kolay: number; orta: number; zor: number; total: number }>
    warnings: string[]
    unknownWords: string[]
    overrideCount: number
    grouped: Record<number, { kolay: string[]; orta: string[]; zor: string[] }>
  }
}
