import 'vuetify/styles'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'ilpea',
    themes: {
      ilpea: {
        dark: false,
        colors: {
          primary: '#107c41',
          secondary: '#1a1a1a',
          surface: '#ffffff',
          background: '#f8f9fa',
          error: '#be123c',
        },
      },
    },
  },
  defaults: {
    VTooltip: { location: 'top' },
    VExpansionPanels: { variant: 'accordion' },
  },
})
