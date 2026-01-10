import io
import logging
from typing import Dict, Any, Optional
from pygltflib import GLTF2

logger = logging.getLogger(__name__)

def extract_vrma_metadata(file_content: bytes) -> Dict[str, Any]:
    """
    Parses a VRMA (GLB) file and extracts animation metadata.
    Returns a dict with duration, framerate (estimated), and frame_count.
    """
    metadata = {
        "duration": 0.0,
        "framerate": 30, # Default assumption or fallback
        "frame_count": 0
    }
    
    try:
        logger.info(f"Starting VRMA extraction for content of size: {len(file_content)} bytes")
        
        # Safe way: use io.BytesIO
        # f = io.BytesIO(file_content) 
        # GLTF2.load_from_bytes expects bytes, not file-like object?
        # Checking source: def load_from_bytes(cls, data: bytes, ...) -> "GLTF2":
        gltf = GLTF2.load_from_bytes(file_content)
        
        if not gltf.animations:
            logger.warning("No animations found in VRMA/GLB file")
            logger.info("Accessors count: %d", len(gltf.accessors))
            return metadata
            
        logger.info(f"Found {len(gltf.animations)} animations")
        
        # We assume the main animation is the first one or we aggregate max duration
        max_duration = 0.0
        
        # Iterate all animations to find max duration
        for i, anim in enumerate(gltf.animations):
            logger.debug(f"Processing animation {i}: {anim.name}")
            for sampler in anim.samplers:
                input_accessor_index = sampler.input
                if input_accessor_index is not None and input_accessor_index < len(gltf.accessors):
                    accessor = gltf.accessors[input_accessor_index]
                    
                    # Duration is usually max value in input (time) accessor
                    if accessor.max and len(accessor.max) > 0:
                         duration = accessor.max[0]
                         if duration > max_duration:
                             max_duration = duration
                    elif accessor.count > 0:
                        # Fallback if max is not computed in file? 
                        # We might need to look at buffer? Complex.
                        pass
                    
        metadata["duration"] = round(max_duration, 3)
        logger.info(f"Calculated Max Duration: {max_duration}")
        
        # Heuristic for FPS: VRM is typically 30 or 60.
        # If we want exact frame count, we need to inspect the time accessor count.
        # Let's take the count from the longest animation accessor.
        
        max_count = 0
        for anim in gltf.animations:
            for sampler in anim.samplers:
                 input_accessor_index = sampler.input
                 if input_accessor_index is not None:
                     accessor = gltf.accessors[input_accessor_index]
                     if accessor.count > max_count:
                         max_count = accessor.count
                         
        metadata["frame_count"] = max_count
        logger.info(f"Calculated Max Frames: {max_count}")
        
        if max_duration > 0 and max_count > 0:
            metadata["framerate"] = int(round(max_count / max_duration))
        
        logger.info(f"Extraction Result: {metadata}")
            
    except Exception as e:
        logger.error(f"Failed to parse VRMA metadata: {e}", exc_info=True)
        
    return metadata
