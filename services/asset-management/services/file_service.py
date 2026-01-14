"""
V-Factory - 파일 처리 서비스
파일 저장, 메타데이터 추출 등
"""
import json
from pathlib import Path
from typing import Dict, Any

import aiofiles
from fastapi import UploadFile

from config import settings


class FileService:
    """파일 처리 서비스 클래스"""
    
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
    
    async def get_file_size(self, file: UploadFile) -> int:
        """
        업로드 파일의 크기 계산
        
        Args:
            file: 업로드된 파일
            
        Returns:
            파일 크기 (바이트)
        """
        # 파일 포인터를 끝으로 이동하여 크기 계산
        await file.seek(0, 2)  # SEEK_END
        size = await file.tell()
        await file.seek(0)  # 다시 처음으로
        return size
    
    async def save_file(self, file: UploadFile, filename: str) -> str:
        """
        파일을 업로드 디렉토리에 저장
        
        Args:
            file: 업로드된 파일
            filename: 저장할 파일명
            
        Returns:
            저장된 파일의 상대 경로
        """
        file_path = self.upload_dir / filename
        
        async with aiofiles.open(file_path, "wb") as f:
            # 청크 단위로 읽어서 저장 (메모리 효율성)
            while chunk := await file.read(1024 * 1024):  # 1MB 청크
                await f.write(chunk)
        
        return filename
    
    async def extract_gltf_metadata(self, file_path: str) -> Dict[str, Any]:
        """
        GLB/GLTF 파일에서 기본 메타데이터 추출
        
        Args:
            file_path: 파일 경로
            
        Returns:
            메타데이터 딕셔너리
        """
        full_path = self.upload_dir / file_path
        metadata = {}
        
        try:
            # GLB 파일인 경우
            if file_path.endswith(".glb"):
                async with aiofiles.open(full_path, "rb") as f:
                    # GLB 헤더 읽기 (12바이트)
                    header = await f.read(12)
                    if len(header) >= 12:
                        magic = header[0:4]
                        version = int.from_bytes(header[4:8], "little")
                        length = int.from_bytes(header[8:12], "little")
                        
                        if magic == b"glTF":
                            metadata["glb_version"] = version
                            metadata["glb_length"] = length
            
            # GLTF 파일인 경우 (JSON)
            elif file_path.endswith(".gltf"):
                async with aiofiles.open(full_path, "r", encoding="utf-8") as f:
                    content = await f.read()
                    gltf_data = json.loads(content)
                    
                    # 기본 정보 추출
                    if "asset" in gltf_data:
                        metadata["gltf_version"] = gltf_data["asset"].get("version")
                        metadata["generator"] = gltf_data["asset"].get("generator")
                    
                    # 메시, 머티리얼, 애니메이션 수
                    metadata["mesh_count"] = len(gltf_data.get("meshes", []))
                    metadata["material_count"] = len(gltf_data.get("materials", []))
                    metadata["animation_count"] = len(gltf_data.get("animations", []))
                    metadata["node_count"] = len(gltf_data.get("nodes", []))
        
        except Exception as e:
            # 메타데이터 추출 실패해도 에셋 저장은 진행
            metadata["extraction_error"] = str(e)
        
        return metadata
    
    async def delete_file(self, file_path: str) -> bool:
        """
        파일 삭제
        
        Args:
            file_path: 삭제할 파일의 상대 경로
            
        Returns:
            삭제 성공 여부
        """
        full_path = self.upload_dir / file_path
        
        if full_path.exists():
            full_path.unlink()
            return True
        
        return False
