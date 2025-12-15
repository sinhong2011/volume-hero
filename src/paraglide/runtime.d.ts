/**
 * Auto-generated type declarations for Paraglide runtime
 * This file provides TypeScript types for the generated runtime.js
 */

/**
 * Available language tags in this project
 */
export type AvailableLanguageTag = "en" | "zh-CN" | "zh-TW" | "ja" | "ko";

/**
 * Array of all available language tags
 */
export const availableLanguageTags: readonly AvailableLanguageTag[];

/**
 * The source language tag (default language)
 */
export const sourceLanguageTag: AvailableLanguageTag;

/**
 * Check if a string is a valid language tag
 */
export function isAvailableLanguageTag(tag: string): tag is AvailableLanguageTag;

/**
 * Get the current language tag
 * Can be called with no arguments to get the current language,
 * or with a getter function that returns the language
 */
export function languageTag(): AvailableLanguageTag;

/**
 * Set the language tag
 * Can be a direct value or a getter function
 */
export function setLanguageTag(tag: AvailableLanguageTag | (() => AvailableLanguageTag)): void;

/**
 * Called when the language changes
 */
export function onSetLanguageTag(callback: (tag: AvailableLanguageTag) => void): void;

