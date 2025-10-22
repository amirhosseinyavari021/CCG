export const osDetails = {
  ubuntu: {
    versions: [], // Versions removed as per new logic
    clis: ['Bash', 'Zsh']
  },
  debian: {
    versions: [],
    clis: ['Bash', 'Zsh']
  },
  fedora: {
    versions: [],
    clis: ['Bash', 'Zsh']
  },
  'centos-stream': {
    versions: [],
    clis: ['Bash', 'Zsh']
  },
  centos: {
    versions: [],
    clis: ['Bash', 'Zsh']
  },
  arch: {
    versions: [],
    clis: ['Bash', 'Zsh']
  },
  windows: {
    versions: [],
    clis: ['PowerShell 7', 'CMD']
  },
  macos: {
    versions: [],
    clis: ['Zsh', 'Bash']
  },
  cisco: {
    versions: [],
    clis: ['CLI']
  },
  mikrotik: {
    versions: [],
    clis: ['MikroTik CLI']
  },
  python: {
    versions: [],
    clis: ['Python 3']
  },
  other: {
    versions: ['N/A'], // This field will be treated as optional text input
    clis: ['Bash', 'Zsh', 'PowerShell', 'CMD', 'Sh'] // Common shells
  }
};