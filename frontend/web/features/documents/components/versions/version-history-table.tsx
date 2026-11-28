"use client";

import { useAccountTimezone } from "@/features/user-setting/hooks/use-account-timezone";

import React from "react";
import { DocumentItem, DocumentVersion } from "../../types/documents.types";
import { formatBytes, formatDateShort } from "../../utils/documents.utils";
import { ORIGINAL_VERSION_ID } from "../../types/documents.constants";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { VERSION_MESSAGES } from "../../types/document-version.constants";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { VersionActionsMenu } from "./version-actions-menu";

interface VersionHistoryTableProps {
  versions: DocumentVersion[];
  isLoading: boolean;
  item: DocumentItem;
  onPreviewVersion: (item: DocumentItem, versionId: string) => void;
  onDownload: (versionId: string) => void;
  canChangeCurrent?: boolean;
  savingCurrent?: boolean;
  uploadInProgress?: boolean;
  onSaveCurrent?: (versionId: string) => void;
  canDeleteVersion?: boolean;
  onDeleteVersion?: (version: DocumentVersion) => void;
}

export function VersionHistoryTable({
  versions,
  isLoading,
  item,
  onPreviewVersion,
  onDownload,
  canChangeCurrent = false,
  savingCurrent = false,
  uploadInProgress = false,
  onSaveCurrent,
  canDeleteVersion = false,
  onDeleteVersion,
}: VersionHistoryTableProps) {
  useAccountTimezone();
  const currentVersionId =
    versions.find((version) => version.isCurrent)?.id ?? "";
  const [selection, setSelectedVersionId] = React.useState(currentVersionId);
  const selectedVersionId = versions.some((version) => version.id === selection)
    ? selection
    : currentVersionId;
  const radioName = React.useId();
  if (isLoading) {
    return (
      <div role="status" className="flex justify-center items-center py-10">
        <Spinner size={24} />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground font-semibold text-sm">
        No version history available
      </div>
    );
  }

  return (
    <RadioGroup
      value={selectedVersionId}
      onValueChange={(versionId) => setSelectedVersionId(versionId)}
      name={radioName}
      disabled={savingCurrent || uploadInProgress}
      aria-label="Current document version"
      className="space-y-3"
    >
      {canChangeCurrent && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {VERSION_MESSAGES.currentHelp}
        </p>
      )}
      <div className="border border-border rounded-panel overflow-x-auto">
        <Table unstyled className="w-full text-left border-collapse text-xs">
          <TableHeader unstyled>
            <TableRow
              unstyled
              className="bg-background border-b border-border text-muted-foreground font-semibold uppercase tracking-wider"
            >
              {canChangeCurrent && (
                <TableHead unstyled className="w-14 px-3 py-3 align-middle">
                  <span className="sr-only">Select current version</span>
                </TableHead>
              )}
              <TableHead unstyled className="px-5 py-3">
                Version
              </TableHead>
              <TableHead unstyled className="px-5 py-3">
                Date
              </TableHead>
              <TableHead unstyled className="px-5 py-3">
                Size
              </TableHead>
              <TableHead unstyled className="px-5 py-3">
                Uploaded By
              </TableHead>
              <TableHead unstyled className="px-5 py-3 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody
            unstyled
            className="divide-y divide-border font-semibold text-foreground"
          >
            {versions.map((version) => {
              const isCurrent = version.isCurrent;

              return (
                <TableRow
                  unstyled
                  key={version.id}
                  className={`hover:bg-background transition-colors ${
                    isCurrent ? "bg-info-soft/10 font-semibold" : ""
                  }`}
                >
                  {canChangeCurrent && (
                    <TableCell unstyled className="w-14 px-3 py-4 align-middle">
                      <label className="flex size-8 cursor-pointer items-center justify-center">
                        <RadioGroupItem
                          value={version.id}
                          aria-label={`Use version ${version.versionNumber} as current`}
                          disabled={savingCurrent || uploadInProgress}
                        />
                      </label>
                    </TableCell>
                  )}
                  <TableCell unstyled className="px-5 py-4 align-middle">
                    <div className="flex min-h-8 items-center gap-2 whitespace-nowrap">
                      <span>v{version.versionNumber}</span>
                      {isCurrent && (
                        <span className="bg-info-soft text-info-content text-xs px-2 py-0.5 rounded-full font-semibold border border-border">
                          Current
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell
                    unstyled
                    className="whitespace-nowrap px-5 py-4 align-middle tabular-nums text-muted-foreground"
                  >
                    {formatDateShort(version.createdAt)}
                  </TableCell>
                  <TableCell
                    unstyled
                    className="whitespace-nowrap px-5 py-4 align-middle tabular-nums text-muted-foreground"
                  >
                    {formatBytes(Number(version.sizeBytes))}
                  </TableCell>
                  <TableCell
                    unstyled
                    className="px-5 py-4 align-middle text-muted-foreground"
                    title={version.uploadedByEmail}
                  >
                    <span className="block max-w-[120px] truncate">
                      {version.uploadedByEmail}
                    </span>
                  </TableCell>
                  <TableCell
                    unstyled
                    className="px-5 py-4 align-middle text-right"
                  >
                    <div className="flex min-h-8 items-center justify-end">
                      <VersionActionsMenu
                        version={version}
                        versionCount={versions.length}
                        canDelete={canDeleteVersion}
                        busy={savingCurrent || uploadInProgress}
                        onPreview={() =>
                          onPreviewVersion(
                            item,
                            version.id === ORIGINAL_VERSION_ID
                              ? ""
                              : version.id,
                          )
                        }
                        onDownload={() => onDownload(version.id)}
                        onDelete={() => onDeleteVersion?.(version)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {canChangeCurrent && (
        <div className="flex justify-end">
          <Button
            onClick={() => onSaveCurrent?.(selectedVersionId)}
            disabled={
              !selectedVersionId ||
              selectedVersionId === currentVersionId ||
              savingCurrent ||
              uploadInProgress
            }
          >
            {savingCurrent
              ? VERSION_MESSAGES.saving
              : VERSION_MESSAGES.saveCurrent}
          </Button>
        </div>
      )}
    </RadioGroup>
  );
}
