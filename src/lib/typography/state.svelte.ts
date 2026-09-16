import { DEFAULT_TEXT } from '../retalics/config';

/**
 * View state for the lab. Deliberately separate from RetalicsConfig: none of
 * this belongs in the design data that feeds the font build.
 */
class TypographyState {
	text = $state(DEFAULT_TEXT);
	wght = $state(700);
	slnt = $state(0);
	tracking = $state(0);
	fontSize = $state(72);
	lineHeight = $state(1.15);
	kerning = $state(true);
	calt = $state(true);
	retalicsEnabled = $state(true);
}

export const typography = new TypographyState();
