export const osDetails = {
  linux: {
    versions: ['Ubuntu 24.04 LTS', 'Debian 12', 'Fedora 40', 'Arch Linux (Latest)'],
    clis: ['Bash', 'Zsh', 'Fish']
  },
  windows: {
    versions: ['Windows 11', 'Windows 10', 'Windows Server 2025'],
    clis: ['PowerShell 7', 'CMD']
  },
  macos: {
    versions: ['Sequoia (15)', 'Sonoma (14)'],
    clis: ['Zsh', 'Bash']
  },
  other: {
    versions: [], // No predefined versions for 'other'
    clis: ['Bash', 'Zsh', 'PowerShell', 'CMD', 'Sh'] // A generic list of common shells
  }
};
