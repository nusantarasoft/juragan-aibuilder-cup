// ProComponents Demo Index
// This file exports all ProComponent demo data

export { proTableData } from "./ProTableDemos";
export { proFormData } from "./ProFormDemos";
export { proCardData } from "./ProCardDemos";
export { proListData } from "./ProListDemos";
export { proDescriptionsData } from "./ProDescriptionsDemos";
export { pageContainerData } from "./PageContainerDemos";
export { proLayoutData } from "./ProLayoutDemos";
export { proFormFieldsData } from "./ProFormFieldsDemos";
export { proFormListData } from "./ProFormListDemos";
export { proSkeletonData } from "./ProSkeletonDemos";
export { proFieldData } from "./ProFieldDemos";
export { editableProTableData } from "./EditableProTableDemos";
export { checkCardData } from "./CheckCardDemos";
export { footerToolbarData } from "./FooterToolbarDemos";
export { statisticCardData } from "./StatisticCardDemos";
export { stepsFormData } from "./StepsFormDemos";
export { modalDrawerFormData } from "./ModalDrawerFormDemos";
export { queryFilterData } from "./QueryFilterDemos";
export { loginFormData } from "./LoginFormDemos";

// Re-export types
export type { AntdComponentData, DemoExample, PropDefinition } from "../AntdStyleContent";

// Component data mapping
import { proTableData } from "./ProTableDemos";
import { proFormData } from "./ProFormDemos";
import { proCardData } from "./ProCardDemos";
import { proListData } from "./ProListDemos";
import { proDescriptionsData } from "./ProDescriptionsDemos";
import { pageContainerData } from "./PageContainerDemos";
import { proLayoutData } from "./ProLayoutDemos";
import { proFormFieldsData } from "./ProFormFieldsDemos";
import { proFormListData } from "./ProFormListDemos";
import { proSkeletonData } from "./ProSkeletonDemos";
import { proFieldData } from "./ProFieldDemos";
import { editableProTableData } from "./EditableProTableDemos";
import { checkCardData } from "./CheckCardDemos";
import { footerToolbarData } from "./FooterToolbarDemos";
import { statisticCardData } from "./StatisticCardDemos";
import { stepsFormData } from "./StepsFormDemos";
import { modalDrawerFormData } from "./ModalDrawerFormDemos";
import { queryFilterData } from "./QueryFilterDemos";
import { loginFormData } from "./LoginFormDemos";
import type { AntdComponentData } from "../AntdStyleContent";

export const proComponentsDataMap: Record<string, AntdComponentData> = {
    // Layout
    "pro-layout": proLayoutData,
    "pro-page-container": pageContainerData,
    "pro-footer-toolbar": footerToolbarData,

    // Data Display
    "pro-table": proTableData,
    "pro-editable-table": editableProTableData,
    "pro-list": proListData,
    "pro-descriptions": proDescriptionsData,
    "pro-card": proCardData,
    "pro-statistic-card": statisticCardData,

    // Form
    "pro-form": proFormData,
    "pro-form-fields": proFormFieldsData,
    "pro-form-list": proFormListData,
    "pro-steps-form": stepsFormData,
    "pro-modal-drawer-form": modalDrawerFormData,
    "pro-query-filter": queryFilterData,
    "pro-login-form": loginFormData,
    "pro-check-card": checkCardData,

    // Other
    "pro-skeleton": proSkeletonData,
    "pro-field": proFieldData,
};
