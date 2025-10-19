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
  cisco: {
    versions: ['IOS', 'IOS-XE', 'NX-OS', 'ASA'],
    clis: ['CLI']
  },
  mikrotik: {
    versions: ['RouterOS v7', 'RouterOS v6'],
    clis: ['MikroTik CLI']
  },
  python: {
    versions: ['Python 3.11', 'Python 3.10', 'Python 3.9'],
    clis: ['Python 3']
  },
  other: {
    versions: [], // No predefined versions
    clis: ['Bash', 'Zsh', 'PowerShell', 'CMD', 'Sh'] // Common shells
  }
};