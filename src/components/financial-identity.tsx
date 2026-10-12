"use client";
import { useLocale } from "../i18n/locale";
import { projectName } from "../product/metadata";
import type { Project } from "../domain/models";
import { ContractAddress, KeyValueList } from "./ui";
export function FinancialIdentity({
  project,
  action,
}: {
  project: Project;
  action?: string;
}) {
  const { locale } = useLocale();
  return (
    <div className="financial-identity" data-contract={project.tokenContract}>
      <KeyValueList
        items={[
          {
            label: "项目",
            value: <span data-user-text>{projectName(project, locale)}</span>,
          },
          {
            label: "代币",
            value: <span data-user-text>{project.symbol}</span>,
          },
          {
            label: "合约地址",
            value: <ContractAddress address={project.tokenContract} />,
          },
          ...(action ? [{ label: "操作", value: action }] : []),
        ]}
      />
    </div>
  );
}
