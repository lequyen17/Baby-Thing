// Icon SVG nét mảnh, kế thừa màu chữ (currentColor)
function Icon({ children, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const ChevronDownIcon = (props) => (
  <Icon {...props}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);

export const LockIcon = (props) => (
  <Icon {...props}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Icon>
);

export const CameraIcon = (props) => (
  <Icon {...props}>
    <path d="M4 8h3l2-2h6l2 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" />
    <circle cx="12" cy="14" r="3" />
  </Icon>
);

export const PlusIcon = (props) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CheckSquareIcon = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M8 12l3 3 5-6" />
  </Icon>
);

export const SearchIcon = (props) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Icon>
);

export const EditIcon = (props) => (
  <Icon {...props}>
    <path d="M4 20h4L19 9l-4-4L4 16v4z" />
    <path d="M13.5 6.5l4 4" />
  </Icon>
);

export const TrashIcon = (props) => (
  <Icon {...props}>
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Icon>
);

export const EyeIcon = (props) => (
  <Icon {...props}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const CartIcon = (props) => (
  <Icon {...props}>
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
    <path d="M2 3h3l2.5 12h11.5l2-8H6.2" />
  </Icon>
);

export const XCircleIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9l-6 6M9 9l6 6" />
  </Icon>
);

export const ArrowLeftIcon = (props) => (
  <Icon {...props}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </Icon>
);

export const HeartIcon = (props) => (
  <Icon {...props}>
    <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
  </Icon>
);

export const StarIcon = (props) => (
  <Icon {...props}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
  </Icon>
);

export const CardIcon = (props) => (
  <Icon {...props}>
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10h18M16 15h2" />
  </Icon>
);

/** Logo Baby Things: trái tim trong vòng tròn. */
export const LogoMark = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <circle cx="20" cy="20" r="19" fill="#F6E3DA" />
    <path
      d="M20 29s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 28 18c0 6-8 11-8 11z"
      stroke="#B84F36"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

export const MessageIcon = (props) => (
  <Icon {...props}>
    <path d="M4 5h16v11H9l-5 4z" />
  </Icon>
);

export const BellIcon = (props) => (
  <Icon {...props}>
    <path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Icon>
);

export const OrderIcon = (props) => (
  <Icon {...props}>
    <path d="M3 7l9-4 9 4v10l-9 4-9-4z" />
    <path d="M3 7l9 4 9-4M12 11v10" />
  </Icon>
);

export const BankIcon = (props) => (
  <Icon {...props}>
    <path d="M3 10l9-6 9 6" />
    <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18" />
  </Icon>
);

export const CheckIcon = (props) => (
  <Icon {...props}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const XIcon = (props) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);
