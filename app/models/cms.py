import uuid
from datetime import datetime
from typing import List, Optional, Any
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Enum, Text, BigInteger
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base

class AnimationAsset(Base):
    """
    Physical animation file stored in S3.
    Contains technical data about the animation.
    """
    __tablename__ = "animation_assets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_url: Mapped[str] = mapped_column(String, nullable=False)
    file_hash: Mapped[str] = mapped_column(String, nullable=False, index=True)  # MD5 for deduplication
    
    duration: Mapped[Optional[float]] = mapped_column(Float)
    framerate: Mapped[Optional[int]] = mapped_column(Integer)
    frame_count: Mapped[Optional[int]] = mapped_column(Integer)
    
    transition_in: Mapped[Optional[str]] = mapped_column(String)
    transition_out: Mapped[Optional[str]] = mapped_column(String)
    blendshapes_list: Mapped[Optional[Any]] = mapped_column(JSONB)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    variants: Mapped[List["SignVariant"]] = relationship(back_populates="asset")


class Gloss(Base):
    """
    A concept/word in the dictionary.
    Ex: "HELLO", "CAR".
    """
    __tablename__ = "glosses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    synonyms: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    variants: Mapped[List["SignVariant"]] = relationship(back_populates="gloss")


class SignLanguage(Base):
    """
    Reference table for Sign Languages.
    Ex: "ru-RSL", "en-ASL".
    """
    __tablename__ = "sign_languages"

    code: Mapped[str] = mapped_column(String, primary_key=True)  # ISO code
    name: Mapped[str] = mapped_column(String, nullable=False)
    
    # Relationships
    variants: Mapped[List["SignVariant"]] = relationship(back_populates="language")


class SignVariant(Base):
    """
    The connection between a Gloss (meaning) and an Asset (file) 
    in a specific Language.
    """
    __tablename__ = "sign_variants"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    
    # Foreign Keys
    gloss_id: Mapped[int] = mapped_column(ForeignKey("glosses.id", ondelete="CASCADE"), nullable=False)
    asset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("animation_assets.id", ondelete="RESTRICT"), nullable=False)
    language_id: Mapped[str] = mapped_column(ForeignKey("sign_languages.code", ondelete="RESTRICT"), nullable=False, default="ru-RSL")
    
    # Metadata
    emotion: Mapped[str] = mapped_column(String, default="Neutral")  # Enum can be string for simplicity
    type: Mapped[str] = mapped_column(String, default="lexical")     # lexical, fingerspelling, etc.
    priority: Mapped[int] = mapped_column(Integer, default=50)       # 100 = high priority
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    gloss: Mapped["Gloss"] = relationship(back_populates="variants")
    asset: Mapped["AnimationAsset"] = relationship(back_populates="variants")
    language: Mapped["SignLanguage"] = relationship(back_populates="variants")
