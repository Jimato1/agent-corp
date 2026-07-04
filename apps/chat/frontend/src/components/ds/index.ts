// Chat design system — public barrel.
// Each component is a faithful TS port of the Helm handoff component
// (context/design/handoff/helm-design-system/project/components/**). Every
// component injects its own scoped <style> at module load (see lib/helmStyle.ts),
// so the visuals are byte-for-byte the Helm inline CSS, not a re-theme.

// core
export { Button } from './Button';
export type { ButtonProps, ButtonTone, ButtonSize } from './Button';
export { IconButton } from './IconButton';
export type { IconButtonProps } from './IconButton';
export { Input } from './Input';
export type { InputProps } from './Input';
export { StatusPill } from './StatusPill';
export type { StatusPillProps, PillTone } from './StatusPill';

// data
export { DataTable } from './DataTable';
export type { DataTableProps, DataColumn } from './DataTable';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { ErrorState } from './ErrorState';
export type { ErrorStateProps } from './ErrorState';
export { Skeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';

// identity
export { PrincipalRef } from './PrincipalRef';
export type { PrincipalRefProps, PrincipalKind } from './PrincipalRef';
export { TicketRef } from './TicketRef';
export type { TicketRefProps } from './TicketRef';
export { FenceState } from './FenceState';
export type { FenceStateProps } from './FenceState';

// safety
export { ReviewChip } from './ReviewChip';
export type { ReviewChipProps } from './ReviewChip';
export { FreshnessStamp } from './FreshnessStamp';
export type { FreshnessStampProps } from './FreshnessStamp';
export { PrintedAbsence } from './PrintedAbsence';
export type { PrintedAbsenceProps } from './PrintedAbsence';
export { HonestState } from './HonestState';
export type { HonestStateProps } from './HonestState';
export { ConfirmFriction } from './ConfirmFriction';
export type { ConfirmFrictionProps } from './ConfirmFriction';
export { DangerAction } from './DangerAction';
export type { DangerActionProps } from './DangerAction';
export { HaltBand } from './HaltBand';
export type { HaltBandProps } from './HaltBand';

// shell
export { AppHeader, KillMirror } from './AppHeader';
export type { AppHeaderProps, KillMirrorProps } from './AppHeader';
export { NavRail } from './NavRail';
export type { NavRailProps, NavItem, Posture } from './NavRail';
export { SuiteSwitcher, HELM_APPS } from './SuiteSwitcher';
export type { SuiteSwitcherProps, SuiteApp } from './SuiteSwitcher';
