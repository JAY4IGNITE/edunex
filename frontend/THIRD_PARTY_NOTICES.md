# Component sources and adaptations

- **shadcn/ui**: Button, Badge, Skeleton, Dialog installed through the official registry. MIT license in `licenses/shadcn-ui.txt`. Source: https://github.com/shadcn-ui/ui. Component primitives use Radix UI.
- **React Bits — SpotlightCard**: adapted from https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Components/SpotlightCard/SpotlightCard.tsx. The neutral hover effect is restricted to the overview context panel. Added reduced-motion handling and restrained styling. Original MIT + Commons Clause terms are retained in `licenses/React-Bits.txt`; the component is used as part of this application, not redistributed as a component product.
- **Origin UI — SelectNative**: adapted from the legacy MIT snapshot at https://github.com/origin-space/originui/blob/main/apps/origin/registry/default/ui/select-native.tsx. Used for Year and Semester controls; imports, spacing, and chevron size adapted. License retained in `licenses/Origin-UI.txt`. No code from the repository's AGPL-licensed directories is incorporated.
- **GSAP**: short page/profile and KPI entrances with `gsap.matchMedia`, cleanup and reduced-motion support. https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/
- **Recharts**: score distribution and historical area chart. Exact values and textual legends accompany visualizations.

Other dependencies retain their licenses in the installed packages. This document does not change the project's license.
