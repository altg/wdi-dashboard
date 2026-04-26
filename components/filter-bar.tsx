"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  PEER_GROUPS,
  getCustomPeerGroups,
  deleteCustomPeerGroup,
  type CustomPeerGroup,
} from "@/lib/registry/peer-groups";
import { PeerGroupBuilder } from "@/components/peer-group-builder";

const REGIONS = PEER_GROUPS.filter((pg) => pg.type === "region");
const INCOME_GROUPS = PEER_GROUPS.filter((pg) => pg.type === "income");

const MIN_YEAR = 2000;

type Props = {
  coveragePct?: number | null;
  latestYear?: number;
};

export function FilterBar({ coveragePct, latestYear = 2023 }: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [customGroups, setCustomGroups] = useState<CustomPeerGroup[]>([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomPeerGroup | undefined>();

  useEffect(() => {
    setCustomGroups(getCustomPeerGroups());
  }, []);

  const YEARS = Array.from(
    { length: latestYear - MIN_YEAR + 1 },
    (_, i) => latestYear - i
  );

  const peerParam = sp.get("peer") ?? "mena";
  const membersParam = sp.get("members") ?? "";
  const year = sp.get("year") ?? String(latestYear);
  const compare = sp.get("compare") ?? String(MIN_YEAR);

  // Determine which <select> option is active
  let selectValue: string = peerParam;
  if (peerParam === "custom") {
    const sortedMembers = membersParam.split(",").filter(Boolean).sort().join(",");
    const match = customGroups.find(
      (g) => g.countryIso3s.slice().sort().join(",") === sortedMembers
    );
    selectValue = match ? `custom:${match.id}` : "__custom_url__";
  }

  function navigate(params: URLSearchParams) {
    router.push(`${pathname}?${params.toString()}`);
  }

  function buildParams() {
    return new URLSearchParams(sp.toString());
  }

  function updateYear(value: string) {
    const params = buildParams();
    params.set("year", value);
    if (parseInt(compare, 10) >= parseInt(value, 10)) {
      params.set("compare", String(parseInt(value, 10) - 1));
    }
    navigate(params);
  }

  function updateCompare(value: string) {
    const params = buildParams();
    params.set("compare", value);
    navigate(params);
  }

  function selectCustomGroup(group: CustomPeerGroup) {
    const params = buildParams();
    params.set("peer", "custom");
    params.set("members", group.countryIso3s.join(","));
    navigate(params);
  }

  function selectBuiltInGroup(id: string) {
    const params = buildParams();
    params.set("peer", id);
    params.delete("members");
    navigate(params);
  }

  function handlePeerChange(value: string) {
    if (value === "__add_custom__") {
      setEditingGroup(undefined);
      setBuilderOpen(true);
      return;
    }
    if (value === "__custom_url__") return;
    if (value.startsWith("custom:")) {
      const groupId = value.slice(7);
      const group = customGroups.find((g) => g.id === groupId);
      if (group) selectCustomGroup(group);
    } else {
      selectBuiltInGroup(value);
    }
  }

  function handleDelete(groupId: string) {
    deleteCustomPeerGroup(groupId);
    setCustomGroups(getCustomPeerGroups());
    if (selectValue === `custom:${groupId}`) {
      selectBuiltInGroup("mena");
    }
  }

  function handleEdit(group: CustomPeerGroup) {
    setEditingGroup(group);
    setBuilderOpen(true);
  }

  function handleGroupSaved(group: CustomPeerGroup) {
    setCustomGroups(getCustomPeerGroups());
    setBuilderOpen(false);
    selectCustomGroup(group);
  }

  const selectCls =
    "h-7 text-[12px] px-2 bg-surface border border-subtle rounded text-primary cursor-pointer";

  const activeCustomGroup =
    peerParam === "custom" && selectValue.startsWith("custom:")
      ? customGroups.find((g) => g.id === selectValue.slice(7))
      : null;

  return (
    <>
      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        <span className="uppercase text-[10px] tracking-[0.5px] text-tertiary">
          Peer group
        </span>

        <select
          value={selectValue}
          onChange={(e) => handlePeerChange(e.target.value)}
          className={`${selectCls} min-w-[150px]`}
        >
          {/* Synthetic option shown when URL has custom members not matching any saved group */}
          {selectValue === "__custom_url__" && (
            <optgroup label="Active">
              <option value="__custom_url__">
                Custom ({membersParam.split(",").filter(Boolean).length} members)
              </option>
            </optgroup>
          )}

          <optgroup label="Regions">
            {REGIONS.map((pg) => (
              <option key={pg.id} value={pg.id}>
                {pg.label}
              </option>
            ))}
          </optgroup>

          <optgroup label="Income groups">
            {INCOME_GROUPS.map((pg) => (
              <option key={pg.id} value={pg.id}>
                {pg.label}
              </option>
            ))}
          </optgroup>

          {customGroups.length > 0 && (
            <optgroup label="Custom">
              {customGroups.map((g) => (
                <option key={g.id} value={`custom:${g.id}`}>
                  {g.label} ({g.countryIso3s.length})
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Edit / delete for the active custom group */}
        {activeCustomGroup && (
          <span className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => handleEdit(activeCustomGroup)}
              title="Edit group"
              className="text-[11px] text-tertiary hover:text-secondary px-1 leading-none"
              aria-label="Edit peer group"
            >
              ✏
            </button>
            <button
              type="button"
              onClick={() => handleDelete(activeCustomGroup.id)}
              title="Delete group"
              className="text-[11px] text-tertiary hover:text-negative px-1 leading-none"
              aria-label="Delete peer group"
            >
              ✕
            </button>
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            setEditingGroup(undefined);
            setBuilderOpen(true);
          }}
          className="text-[10px] text-info hover:underline px-1"
        >
          + Custom
        </button>

        <span className="ml-2 uppercase text-[10px] tracking-[0.5px] text-tertiary">
          Year
        </span>
        <select
          value={year}
          onChange={(e) => updateYear(e.target.value)}
          className={`${selectCls} w-20`}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <span className="ml-2 uppercase text-[10px] tracking-[0.5px] text-tertiary">
          Compare to
        </span>
        <select
          value={compare}
          onChange={(e) => updateCompare(e.target.value)}
          className={`${selectCls} w-20`}
        >
          {YEARS.filter((y) => y < parseInt(year, 10)).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {coveragePct !== null && coveragePct !== undefined && coveragePct < 75 && (
          <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-[rgba(186,117,23,0.12)] text-warning">
            ⚠ Only {Math.round(coveragePct)}% of peer group has data for {year}
          </span>
        )}
      </div>

      {builderOpen && (
        <PeerGroupBuilder
          initial={editingGroup}
          onClose={() => setBuilderOpen(false)}
          onSaved={handleGroupSaved}
        />
      )}
    </>
  );
}
