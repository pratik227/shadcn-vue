import fs from 'node:fs'
import path, { basename } from 'node:path'
import template from 'lodash.template'
import { rimraf } from 'rimraf'

import { colorMapping, colors } from '../src/lib/registry/colors'
import { registrySchema } from '../src/lib/registry/schema'
import { styles } from '../src/lib/registry/styles'
import { themes } from '../src/lib/registry/themes'
import { buildRegistry } from '../src/lib/registry/registry'

const REGISTRY_PATH = path.join(process.cwd(), 'static/registry')

const registry = await buildRegistry()
const result = registrySchema.safeParse(registry)
 
if (!result.success) {
  console.error(result.error)
  process.exit(1)
}

// ----------------------------------------------------------------------------
// Build __registry__/index.js.
// ----------------------------------------------------------------------------
let index = `
// This file is autogenerated by scripts/build-registry.ts
// Do not edit this file directly.
export const Index = {
`

for (const style of styles) {
  index += `  "${style.name}": {`

  // Build style index.
  for (const item of result.data) {
    if (item.type === 'components:ui')
      continue

    const resolveFiles = item.files.map(
      file => `../src/lib/registry/${style.name}/${file}`,
    )

    const type = item.type.split(':')[1]
    index += `
    "${item.name}": {
      name: "${item.name}",
      type: "${item.type}",
      registryDependencies: ${JSON.stringify(item.registryDependencies)},
      component: () => import("../src/lib/registry/${style.name}/${type}/${
			item.name
		}.vue").then((m) => m.default),
      files: [${resolveFiles.map(file => `"${file}"`)}],
    },`
  }

  index += `
  },`
}

index += `
}
`

// Write style index.
rimraf.sync(path.join(process.cwd(), '__registry__/index.js'))
fs.writeFileSync(path.join(process.cwd(), '__registry__/index.js'), index)

// ----------------------------------------------------------------------------
// Build registry/styles/[style]/[name].json.
// ----------------------------------------------------------------------------
for (const style of styles) {
  const targetPath = path.join(REGISTRY_PATH, 'styles', style.name)

  // Create directory if it doesn't exist.
  if (!fs.existsSync(targetPath))
    fs.mkdirSync(targetPath, { recursive: true })

  for (const item of result.data) {
    if (item.type !== 'components:ui')
      continue

    const files = item.files?.map((file) => {
      const content = fs.readFileSync(
        path.join(process.cwd(), 'src/lib/registry', style.name, file),
        'utf8',
      )

      return {
        name: basename(file),
        content,
      }
    })

    const payload = {
      ...item,
      files,
    }

    fs.writeFileSync(
      path.join(targetPath, `${item.name}.json`),
      JSON.stringify(payload, null, 2),
      'utf8',
    )
  }
}

// ----------------------------------------------------------------------------
// Build registry/styles/index.json.
// ----------------------------------------------------------------------------
const stylesJson = JSON.stringify(styles, null, 2)
fs.writeFileSync(
  path.join(REGISTRY_PATH, 'styles/index.json'),
  stylesJson,
  'utf8',
)

const REGISTRY_IGNORE = ['super-form']

// ----------------------------------------------------------------------------
// Build registry/index.json.
// ----------------------------------------------------------------------------
const names = result.data.filter(
  item =>
    item.type === 'components:ui' && !REGISTRY_IGNORE.includes(item.name),
)
const registryJson = JSON.stringify(names, null, 2)
rimraf.sync(path.join(REGISTRY_PATH, 'index.json'))
fs.writeFileSync(path.join(REGISTRY_PATH, 'index.json'), registryJson, 'utf8')

// ----------------------------------------------------------------------------
// Build registry/colors/index.json.
// ----------------------------------------------------------------------------
const colorsTargetPath = path.join(REGISTRY_PATH, 'colors')
rimraf.sync(colorsTargetPath)
if (!fs.existsSync(colorsTargetPath))
  fs.mkdirSync(colorsTargetPath, { recursive: true })

const colorsData: Record<string, any> = {}
for (const [color, value] of Object.entries(colors)) {
  if (typeof value === 'string') {
    colorsData[color] = value
    continue
  }

  if (Array.isArray(value)) {
    colorsData[color] = value.map(item => ({
      ...item,
      rgbChannel: item.rgb.replace(
        /^rgb\((\d+),(\d+),(\d+)\)$/,
        '$1 $2 $3',
      ),
      hslChannel: item.hsl.replace(
        /^hsl\(([\d.]+),([\d.]+%),([\d.]+%)\)$/,
        '$1 $2 $3',
      ),
    }))
    continue
  }

  if (typeof value === 'object') {
    colorsData[color] = {
      ...value,
      rgbChannel: value.rgb.replace(
        /^rgb\((\d+),(\d+),(\d+)\)$/,
        '$1 $2 $3',
      ),
      hslChannel: value.hsl.replace(
        /^hsl\(([\d.]+),([\d.]+%),([\d.]+%)\)$/,
        '$1 $2 $3',
      ),
    }
    continue
  }
}

fs.writeFileSync(
  path.join(colorsTargetPath, 'index.json'),
  JSON.stringify(colorsData, null, 2),
  'utf8',
)

// ----------------------------------------------------------------------------
// Build registry/colors/[base].json.
// ----------------------------------------------------------------------------
export const BASE_STYLES = `@tailwind base;
@tailwind components;
@tailwind utilities;
`

export const BASE_STYLES_WITH_VARIABLES = `@tailwind base;
@tailwind components;
@tailwind utilities;
 
@layer base {
  :root {
    --background: <%- colors.light["background"] %>;
    --foreground: <%- colors.light["foreground"] %>;
 
    --muted: <%- colors.light["muted"] %>;
    --muted-foreground: <%- colors.light["muted-foreground"] %>;
 
    --popover: <%- colors.light["popover"] %>;
    --popover-foreground: <%- colors.light["popover-foreground"] %>;
 
    --card: <%- colors.light["card"] %>;
    --card-foreground: <%- colors.light["card-foreground"] %>;
 
    --border: <%- colors.light["border"] %>;
    --input: <%- colors.light["input"] %>;
 
    --primary: <%- colors.light["primary"] %>;
    --primary-foreground: <%- colors.light["primary-foreground"] %>;
 
    --secondary: <%- colors.light["secondary"] %>;
    --secondary-foreground: <%- colors.light["secondary-foreground"] %>;
 
    --accent: <%- colors.light["accent"] %>;
    --accent-foreground: <%- colors.light["accent-foreground"] %>;
 
    --destructive: <%- colors.light["destructive"] %>;
    --destructive-foreground: <%- colors.light["destructive-foreground"] %>;
 
    --ring: <%- colors.light["ring"] %>;
 
    --radius: 0.5rem;
  }
 
  .dark {
    --background: <%- colors.dark["background"] %>;
    --foreground: <%- colors.dark["foreground"] %>;
 
    --muted: <%- colors.dark["muted"] %>;
    --muted-foreground: <%- colors.dark["muted-foreground"] %>;
 
    --popover: <%- colors.dark["popover"] %>;
    --popover-foreground: <%- colors.dark["popover-foreground"] %>;
 
    --card: <%- colors.dark["card"] %>;
    --card-foreground: <%- colors.dark["card-foreground"] %>;
 
    --border: <%- colors.dark["border"] %>;
    --input: <%- colors.dark["input"] %>;
 
    --primary: <%- colors.dark["primary"] %>;
    --primary-foreground: <%- colors.dark["primary-foreground"] %>;
 
    --secondary: <%- colors.dark["secondary"] %>;
    --secondary-foreground: <%- colors.dark["secondary-foreground"] %>;
 
    --accent: <%- colors.dark["accent"] %>;
    --accent-foreground: <%- colors.dark["accent-foreground"] %>;
 
    --destructive: <%- colors.dark["destructive"] %>;
    --destructive-foreground: <%- colors.dark["destructive-foreground"] %>;
 
    --ring: <%- colors.dark["ring"] %>;
  }
}
 
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}`

for (const baseColor of ['slate', 'gray', 'zinc', 'neutral', 'stone', 'lime']) {
  const base: Record<string, any> = {
    inlineColors: {},
    cssVars: {},
  }
  for (const [mode, values] of Object.entries(colorMapping)) {
    base.inlineColors[mode] = {}
    base.cssVars[mode] = {}
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === 'string') {
        const resolvedColor = value.replace(
          /{{base}}-/g,
					`${baseColor}-`,
        )
        base.inlineColors[mode][key] = resolvedColor

        const [resolvedBase, scale] = resolvedColor.split('-')
        const color = scale
          ? colorsData[resolvedBase].find(
            (item: any) => item.scale === Number.parseInt(scale),
					  )
          : colorsData[resolvedBase]
        if (color)
          base.cssVars[mode][key] = color.hslChannel
      }
    }
  }

  // Build css vars.
  base.inlineColorsTemplate = template(BASE_STYLES)({})
  base.cssVarsTemplate = template(BASE_STYLES_WITH_VARIABLES)({
    colors: base.cssVars,
  })

  fs.writeFileSync(
    path.join(REGISTRY_PATH, `colors/${baseColor}.json`),
    JSON.stringify(base, null, 2),
    'utf8',
  )
}

// ----------------------------------------------------------------------------
// Build registry/themes.css
// ----------------------------------------------------------------------------
export const THEME_STYLES_WITH_VARIABLES = `
  .theme-<%- theme %> {
    --background: <%- colors.light["background"] %>;
    --foreground: <%- colors.light["foreground"] %>;
 
    --muted: <%- colors.light["muted"] %>;
    --muted-foreground: <%- colors.light["muted-foreground"] %>;
 
    --popover: <%- colors.light["popover"] %>;
    --popover-foreground: <%- colors.light["popover-foreground"] %>;
 
    --card: <%- colors.light["card"] %>;
    --card-foreground: <%- colors.light["card-foreground"] %>;
 
    --border: <%- colors.light["border"] %>;
    --input: <%- colors.light["input"] %>;
 
    --primary: <%- colors.light["primary"] %>;
    --primary-foreground: <%- colors.light["primary-foreground"] %>;
 
    --secondary: <%- colors.light["secondary"] %>;
    --secondary-foreground: <%- colors.light["secondary-foreground"] %>;
 
    --accent: <%- colors.light["accent"] %>;
    --accent-foreground: <%- colors.light["accent-foreground"] %>;
 
    --destructive: <%- colors.light["destructive"] %>;
    --destructive-foreground: <%- colors.light["destructive-foreground"] %>;
 
    --ring: <%- colors.light["ring"] %>;
 
    --radius: 0.5rem;
  }
 
  .dark .theme-<%- theme %> {
    --background: <%- colors.dark["background"] %>;
    --foreground: <%- colors.dark["foreground"] %>;
 
    --muted: <%- colors.dark["muted"] %>;
    --muted-foreground: <%- colors.dark["muted-foreground"] %>;
 
    --popover: <%- colors.dark["popover"] %>;
    --popover-foreground: <%- colors.dark["popover-foreground"] %>;
 
    --card: <%- colors.dark["card"] %>;
    --card-foreground: <%- colors.dark["card-foreground"] %>;
 
    --border: <%- colors.dark["border"] %>;
    --input: <%- colors.dark["input"] %>;
 
    --primary: <%- colors.dark["primary"] %>;
    --primary-foreground: <%- colors.dark["primary-foreground"] %>;
 
    --secondary: <%- colors.dark["secondary"] %>;
    --secondary-foreground: <%- colors.dark["secondary-foreground"] %>;
 
    --accent: <%- colors.dark["accent"] %>;
    --accent-foreground: <%- colors.dark["accent-foreground"] %>;
 
    --destructive: <%- colors.dark["destructive"] %>;
    --destructive-foreground: <%- colors.dark["destructive-foreground"] %>;
 
    --ring: <%- colors.dark["ring"] %>;
  }`

const themeCSS = []
for (const theme of themes) {
  themeCSS.push(
    template(THEME_STYLES_WITH_VARIABLES)({
      colors: theme.cssVars,
      theme: theme.name,
    }),
  )
}

fs.writeFileSync(
  path.join(REGISTRY_PATH, 'themes.css'),
  themeCSS.join('\n'),
  'utf8',
)

console.log('✅ Done!')
