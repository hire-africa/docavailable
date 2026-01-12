import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Text } from 'react-native';

// Define icon types for better TypeScript support
export type IconType = 'fontawesome' | 'material' | 'ionicons';

// Common icon names that are guaranteed to work
export const IconNames = {
  // FontAwesome icons
  home: 'home',
  user: 'user',
  search: 'search',
  refresh: 'refresh',
  spinner: 'spinner',
  star: 'star',
  calendar: 'calendar',
  file: 'file-text-o',
  check: 'check',
  times: 'times',
  arrowLeft: 'arrow-left',
  arrowRight: 'arrow-right',
  chevronRight: 'chevron-right',
  eye: 'eye',
  lock: 'lock',
  bell: 'bell',
  creditCard: 'credit-card',
  questionCircle: 'question-circle',
  signOut: 'sign-out',
  sort: 'sort',
  clock: 'clock-o',
  mapMarker: 'map-marker',
  userMd: 'user-md',
  calendarCheck: 'calendar-check-o',
  comments: 'comments',
  edit: 'edit',
  phone: 'phone',
  heartbeat: 'heartbeat',
  exclamationTriangle: 'exclamation-triangle',
  infoCircle: 'info-circle',
  cog: 'cog',
  upload: 'upload',
  save: 'save',
  money: 'money',
  bank: 'bank',
  mobile: 'mobile',
  graduationCap: 'graduation-cap',
  certificate: 'certificate',
  shield: 'shield',
  idCard: 'id-card',
  idBadge: 'id-badge',
  camera: 'camera',
  checkSquare: 'check-square-o',
  square: 'square-o',
  heart: 'heart',
  emergency: 'ambulance',
  health: 'heartbeat',
  plan: 'credit-card',
  profile: 'user',
  settings: 'cog',
  help: 'question-circle',
  network: 'wifi',
  logout: 'sign-out',
  menu: 'bars',
  close: 'times',
  plus: 'plus',
  minus: 'minus',
  checkmark: 'check',
  warning: 'exclamation-triangle',
  info: 'info-circle',
  location: 'map-marker',
  time: 'clock-o',
  message: 'comments',
  video: 'video-camera',
  voice: 'phone',
  text: 'file-text-o',
  online: 'circle',
  offline: 'circle-o',
  pending: 'clock-o',
  confirmed: 'check-circle',
  completed: 'check-circle-o',
  cancelled: 'times-circle',
  expired: 'exclamation-circle',
  reschedule: 'refresh',
  export: 'download',
  delete: 'trash',
  more: 'ellipsis-h',
  back: 'arrow-left',
  forward: 'arrow-right',
  up: 'chevron-up',
  down: 'chevron-down',
  left: 'chevron-left',
  right: 'chevron-right',
  share: 'share',
  bookmark: 'bookmark',
  bookmarkO: 'bookmark-o',
  robot: 'robot',
  apple: 'apple',
  // Additional icons for blog articles
  // Material icons
  add: 'add',
  closeMaterial: 'close',
  menuMaterial: 'menu',
  moreVert: 'more-vert',
  settingsMaterial: 'settings',
  person: 'person',
  email: 'email',
  phoneAndroid: 'phone',
  locationOn: 'location-on',
  schedule: 'schedule',
  payment: 'payment',
  security: 'security',
  helpMaterial: 'help',
  exitToApp: 'exit-to-app',

  // Ionicons
  iosHome: 'ios-home',
  iosPerson: 'ios-person',
  iosSearch: 'ios-search',
  iosRefresh: 'ios-refresh',
  iosStar: 'ios-star',
  iosCalendar: 'ios-calendar',
  iosCheckmark: 'ios-checkmark',
  iosClose: 'ios-close',
  iosArrowBack: 'ios-arrow-back',
  iosArrowForward: 'ios-arrow-forward',
  iosEye: 'ios-eye',
  iosLock: 'ios-lock',
  iosNotifications: 'ios-notifications',
  iosCard: 'ios-card',
  iosHelp: 'ios-help-circle',
  iosLogOut: 'ios-log-out',
  iosMenu: 'ios-menu',
  iosMore: 'ios-more',
  iosSettings: 'ios-settings',
  iosPersonAdd: 'ios-person-add',
  iosMail: 'ios-mail',
  iosCall: 'ios-call',
  iosLocation: 'ios-location',
  iosTime: 'ios-time',
  iosCardOutline: 'ios-card-outline',
  iosShield: 'ios-shield',
  iosHelpCircleOutline: 'ios-help-circle-outline',
  iosExit: 'ios-exit',

  // Added icons
  play: 'play',
  playCircle: 'play-circle',
  comment: 'comment',
  wifi: 'wifi',
  globe: 'globe',
  image: 'image',
  'shopping-cart': 'shopping-cart',
  shoppingCart: 'shopping-cart',
} as const;

export type IconName = keyof typeof IconNames;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  type?: IconType;
  style?: any;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#000',
  type = 'fontawesome',
  style
}) => {
  // Get the actual icon name
  const iconName = IconNames[name];

  if (!iconName) {
    console.warn(`Icon name "${name}" not found in IconNames`);
    return null;
  }

  // Platform-specific icon selection
  const getIconComponent = () => {
    switch (type) {
      case 'material':
        return <MaterialIcons name={iconName as any} size={size} color={color} style={style} />;
      case 'ionicons':
        return <Ionicons name={iconName as any} size={size} color={color} style={style} />;
      case 'fontawesome':
      default:
        return <FontAwesome name={iconName as any} size={size} color={color} style={style} />;
    }
  };

  try {
    return getIconComponent();
  } catch (error) {
    console.error(`Error rendering icon "${name}":`, error);
    // Fallback to a simple text icon
    return (
      <Text style={[{ fontSize: size, color }, style]}>
        {getFallbackIcon(name)}
      </Text>
    );
  }
};

// Fallback icons using emoji/text
const getFallbackIcon = (name: IconName): string => {
  const fallbackMap: Record<IconName, string> = {
    home: '🏠',
    user: '👤',
    search: '🔍',
    refresh: '🔄',
    spinner: '⏳',
    star: '⭐',
    calendar: '📅',
    file: '📄',
    check: '✅',
    times: '❌',
    arrowLeft: '⬅️',
    arrowRight: '➡️',
    chevronRight: '▶️',
    eye: '👁️',
    lock: '🔒',
    bell: '🔔',
    creditCard: '💳',
    questionCircle: '❓',
    signOut: '🚪',
    sort: '📊',
    clock: '⏰',
    mapMarker: '📍',
    userMd: '👨‍⚕️',
    calendarCheck: '✅',
    comments: '💬',
    edit: '✏️',
    phone: '📞',
    heartbeat: '❤️',
    exclamationTriangle: '⚠️',
    infoCircle: 'ℹ️',
    cog: '⚙️',
    upload: '📤',
    save: '💾',
    money: '💰',
    bank: '🏦',
    mobile: '📱',
    graduationCap: '🎓',
    certificate: '📜',
    shield: '🛡️',
    idCard: '🆔',
    idBadge: '🆔',
    camera: '📷',
    checkSquare: '☑️',
    square: '☐',
    heart: '❤️',
    emergency: '🚑',
    health: '❤️',
    plan: '💳',
    profile: '👤',
    settings: '⚙️',
    help: '❓',
    network: '📶',
    logout: '🚪',
    menu: '☰',
    close: '❌',
    plus: '➕',
    minus: '➖',
    checkmark: '✅',
    warning: '⚠️',
    info: 'ℹ️',
    location: '📍',
    time: '⏰',
    message: '💬',
    video: '📹',
    voice: '📞',
    text: '📄',
    online: '🟢',
    offline: '🔴',
    pending: '⏳',
    confirmed: '✅',
    completed: '✅',
    cancelled: '❌',
    expired: '⏰',
    reschedule: '🔄',
    export: '📥',
    delete: '🗑️',
    more: '⋯',
    back: '⬅️',
    forward: '➡️',
    up: '⬆️',
    down: '⬇️',
    left: '◀️',
    right: '▶️',
    share: '📤',
    bookmark: '🔖',
    bookmarkO: '🔖',
    robot: '🤖',
    apple: '🍎',
    // Material icons
    add: '➕',
    closeMaterial: '❌',
    menuMaterial: '☰',
    moreVert: '⋯',
    settingsMaterial: '⚙️',
    person: '👤',
    email: '📧',
    phoneAndroid: '📞',
    locationOn: '📍',
    schedule: '📅',
    payment: '💳',
    security: '🔒',
    helpMaterial: '❓',
    exitToApp: '🚪',
    // Ionicons
    iosHome: '🏠',
    iosPerson: '👤',
    iosSearch: '🔍',
    iosRefresh: '🔄',
    iosStar: '⭐',
    iosCalendar: '📅',
    iosCheckmark: '✅',
    iosClose: '❌',
    iosArrowBack: '⬅️',
    iosArrowForward: '➡️',
    iosEye: '👁️',
    iosLock: '🔒',
    iosNotifications: '🔔',
    iosCard: '💳',
    iosHelp: '❓',
    iosLogOut: '🚪',
    iosMenu: '☰',
    iosMore: '⋯',
    iosSettings: '⚙️',
    iosPersonAdd: '👤➕',
    iosMail: '📧',
    iosCall: '📞',
    iosLocation: '📍',
    iosTime: '⏰',
    iosCardOutline: '💳',
    iosShield: '🛡️',
    iosHelpCircleOutline: '❓',
    iosExit: '🚪',

    // Added icons fallbacks
    play: '▶️',
    playCircle: '▶️',
    comment: '💬',
    wifi: '📶',
    globe: '🌍',
    image: '🖼️',
    'shopping-cart': '🛒',
    shoppingCart: '🛒',
  };

  return fallbackMap[name] || '❓';
};

export default Icon; 