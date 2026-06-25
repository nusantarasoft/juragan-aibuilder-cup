import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function ClippingPlanesManager({ 
  enabled, 
  clipX, 
  clipY, 
  clipZ 
}: { 
  enabled: boolean; 
  clipX: number; 
  clipY: number; 
  clipZ: number; 
}) {
  const { gl } = useThree();

  const planes = useMemo(() => {
    return [
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), clipX),
      new THREE.Plane(new THREE.Vector3(1, 0, 0), clipX),
      new THREE.Plane(new THREE.Vector3(0, -1, 0), clipY),
      new THREE.Plane(new THREE.Vector3(0, 0, -1), clipZ),
      new THREE.Plane(new THREE.Vector3(0, 0, 1), clipZ),
    ];
  }, [clipX, clipY, clipZ]);

  useEffect(() => {
    if (enabled) {
      gl.localClippingEnabled = true;
      // gl.clippingPlanes is global for the renderer
      gl.clippingPlanes = planes;
    } else {
      gl.localClippingEnabled = false;
      gl.clippingPlanes = [];
    }
    return () => {
      gl.localClippingEnabled = false;
      gl.clippingPlanes = [];
    };
  }, [enabled, planes, gl]);

  return null;
}
