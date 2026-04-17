import { useEffect, useRef, useState } from "react";
import { DEFAULT_PHYSICS_BY_VERSION } from "../constants";
import type { PhysicsUiConfig, ViewerVersion } from "../types";

export function useVersionedPhysics(activeVersion: ViewerVersion) {
  const [physicsByVersion, setPhysicsByVersion] = useState<
    Record<ViewerVersion, PhysicsUiConfig>
  >(() => ({ ...DEFAULT_PHYSICS_BY_VERSION }));

  const physics = physicsByVersion[activeVersion];

  const updatePhysics = (patch: Partial<PhysicsUiConfig>) => {
    setPhysicsByVersion((current) => {
      const nextVersionConfig = { ...current[activeVersion], ...patch };
      const next = { ...current, [activeVersion]: nextVersionConfig };

      // The viewer listens globally for physics config patches.
      window.dispatchEvent(
        new CustomEvent("physics-config", { detail: patch }),
      );
      return next;
    });
  };

  const previousVersionRef = useRef<ViewerVersion | null>(null);

  useEffect(() => {
    if (previousVersionRef.current === activeVersion) {
      return;
    }

    previousVersionRef.current = activeVersion;

    // When switching versions, apply the full stored preset so the new viewer mounts
    // with the right values (not a stale config from a previous version).
    window.dispatchEvent(
      new CustomEvent("physics-config", {
        detail: physicsByVersion[activeVersion],
      }),
    );
    window.dispatchEvent(new CustomEvent("physics-reset"));
  }, [activeVersion, physicsByVersion]);

  return {
    physics,
    updatePhysics,
  };
}
