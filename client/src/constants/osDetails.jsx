export const osDetails = {
  ubuntu: {
    clis: ['Bash', 'Zsh']
  },
  debian: {
    clis: ['Bash', 'Zsh']
  },
  fedora: {
    clis: ['Bash', 'Zsh']
  },
  // 'centos-stream': { // REMOVED
  //   clis: ['Bash', 'Zsh']
  // },
  centos: {
    clis: ['Bash', 'Zsh']
  },
  arch: { // Assuming Arch Linux is meant, kept as 'arch' for consistency
    clis: ['Bash', 'Zsh']
  },
  windows: {
    clis: ['PowerShell 7', 'CMD']
  },
  macos: {
    clis: ['Zsh', 'Bash']
  },
  cisco: {
    clis: ['CLI'] // Cisco IOS CLI
  },
  mikrotik: { // ADDED
    clis: ['MikroTik CLI'] // RouterOS CLI
  },
  fortigate: { // ADDED
    clis: ['FortiOS CLI'] // FortiOS CLI
  },
  python: {
    clis: ['Python 3']
  },
  other: {
    clis: ['Bash', 'Zsh', 'PowerShell', 'CMD', 'Sh'] // Common shells
  }
};