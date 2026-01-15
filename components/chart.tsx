import { ChartStyle } from "@/components/ui/chart"
import { ChartLegendContent } from "@/components/ui/chart"
import { ChartLegend } from "@/components/ui/chart"
import { ChartTooltipContent } from "@/components/ui/chart"
import { ChartTooltip } from "@/components/ui/chart"
import { ChartContainer } from "@/components/ui/chart"
// ... existing code ...

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  // <CHANGE> Added Chart as alias for ChartContainer to support different import patterns
  ChartContainer as Chart,
}
