/**
 * Custom checkbox prompt for skill selection with detail view
 * Supports 'd' key to view full description of currently focused skill
 */

import { createPrompt, useState, useKeypress, usePrefix, usePagination, useMemo, makeTheme, isUpKey, isDownKey, isSpaceKey, isNumberKey, isEnterKey, Separator } from '@inquirer/core';
import { cursorHide } from '@inquirer/ansi';
import colors from 'yoctocolors-cjs';
import figures from '@inquirer/figures';

const skillCheckboxTheme = {
  icon: {
    checked: colors.green(figures.circleFilled),
    unchecked: figures.circle,
    cursor: figures.pointer,
  },
  style: {
    disabledChoice: (text) => colors.dim(`- ${text}`),
    renderSelectedChoices: (selectedChoices) => selectedChoices.map((choice) => choice.short).join(', '),
    description: (text) => colors.cyan(text),
    detailBox: (text) => colors.yellow(text),
    keysHelpTip: (keys) => keys
      .map(([key, action]) => `${colors.bold(key)} ${colors.dim(action)}`)
      .join(colors.dim(' • ')),
  },
  helpMode: 'always',
};

function isSelectable(item) {
  return !Separator.isSeparator(item) && !item.disabled;
}

function isChecked(item) {
  return isSelectable(item) && item.checked;
}

function toggle(item) {
  return isSelectable(item) ? { ...item, checked: !item.checked } : item;
}

function check(checked) {
  return function (item) {
    return isSelectable(item) ? { ...item, checked } : item;
  };
}

function normalizeChoices(choices) {
  return choices.map((choice) => {
    if (Separator.isSeparator(choice)) return choice;
    if (typeof choice === 'string') {
      return {
        value: choice,
        name: choice,
        short: choice,
        checkedName: choice,
        disabled: false,
        checked: false,
      };
    }
    const name = choice.name ?? String(choice.value);
    const normalizedChoice = {
      value: choice.value,
      name,
      short: choice.short ?? name,
      checkedName: choice.checkedName ?? name,
      disabled: choice.disabled ?? false,
      checked: choice.checked ?? false,
    };
    // Store full description for detail view
    if (choice.description) {
      normalizedChoice.description = choice.description;
    }
    return normalizedChoice;
  });
}

/**
 * Custom checkbox prompt that supports viewing full description with 'd' key
 * @param {Object} config - Configuration object
 * @param {string} config.message - Prompt message
 * @param {Array} config.choices - Array of choices
 * @param {number} config.pageSize - Number of items to show per page
 * @param {boolean} config.loop - Whether to loop navigation
 * @param {boolean} config.required - Whether at least one selection is required
 * @param {Function} config.validate - Validation function
 * @param {Function} config.onDetail - Callback when detail key is pressed
 */
export const skillCheckbox = createPrompt((config, done) => {
  const { 
    instructions,
    pageSize = 10,
    loop = true,
    required,
    validate = () => true,
    onDetail,
  } = config;

  const shortcuts = { all: 'a', invert: 'i', detail: 'd', ...config.shortcuts };
  const theme = makeTheme(skillCheckboxTheme, config.theme);

  const [status, setStatus] = useState('idle');
  const prefix = usePrefix({ status, theme });
  const [items, setItems] = useState(normalizeChoices(config.choices));
  const [showDetail, setShowDetail] = useState(false);

  const bounds = useMemo(() => {
    const first = items.findIndex(isSelectable);
    const last = items.findLastIndex(isSelectable);
    if (first === -1) {
      throw new Error('[checkbox prompt] No selectable choices. All choices are disabled.');
    }
    return { first, last };
  }, [items]);

  const [active, setActive] = useState(bounds.first);
  const [errorMsg, setError] = useState();

  useKeypress(async (key) => {
    // Handle detail view mode - any key closes it
    if (showDetail) {
      setShowDetail(false);
      return;
    }

    if (isEnterKey(key)) {
      const selection = items.filter(isChecked);
      const isValid = await validate([...selection]);
      if (required && !items.some(isChecked)) {
        setError('At least one choice must be selected');
      } else if (isValid === true) {
        setStatus('done');
        done(selection.map((choice) => choice.value));
      } else {
        setError(isValid || 'You must select a valid value');
      }
    } else if (isUpKey(key) || isDownKey(key)) {
      if (loop ||
          (isUpKey(key) && active !== bounds.first) ||
          (isDownKey(key) && active !== bounds.last)) {
        const offset = isUpKey(key) ? -1 : 1;
        let next = active;
        do {
          next = (next + offset + items.length) % items.length;
        } while (!isSelectable(items[next]));
        setActive(next);
      }
    } else if (isSpaceKey(key)) {
      setError(undefined);
      setItems(items.map((choice, i) => (i === active ? toggle(choice) : choice)));
    } else if (key.name === shortcuts.all) {
      const selectAll = items.some((choice) => isSelectable(choice) && !choice.checked);
      setItems(items.map(check(selectAll)));
    } else if (key.name === shortcuts.invert) {
      setItems(items.map(toggle));
    } else if (key.name === shortcuts.detail) {
      // Show detail view for current active item
      const activeItem = items[active];
      if (activeItem && isSelectable(activeItem) && activeItem.value?.description) {
        setShowDetail(true);
        if (onDetail) {
          onDetail(activeItem.value);
        }
      }
    } else if (isNumberKey(key)) {
      const selectedIndex = Number(key.name) - 1;
      let selectableIndex = -1;
      const position = items.findIndex((item) => {
        if (Separator.isSeparator(item)) return false;
        selectableIndex++;
        return selectableIndex === selectedIndex;
      });
      const selectedItem = items[position];
      if (selectedItem && isSelectable(selectedItem)) {
        setActive(position);
        setItems(items.map((choice, i) => (i === position ? toggle(choice) : choice)));
      }
    }
  });

  const message = theme.style.message(config.message, status);
  
  const page = usePagination({
    items,
    active,
    renderItem({ item, isActive }) {
      if (Separator.isSeparator(item)) {
        return ` ${item.separator}`;
      }
      if (item.disabled) {
        const disabledLabel = typeof item.disabled === 'string' ? item.disabled : '(disabled)';
        return theme.style.disabledChoice(`${item.name} ${disabledLabel}`);
      }
      const checkbox = item.checked ? theme.icon.checked : theme.icon.unchecked;
      const name = item.checked ? item.checkedName : item.name;
      const color = isActive ? theme.style.highlight : (x) => x;
      const cursor = isActive ? theme.icon.cursor : ' ';
      return color(`${cursor}${checkbox} ${name}`);
    },
    pageSize,
    loop,
  });

  // Detail view mode - show full description
  if (showDetail) {
    const activeItem = items[active];
    const skill = activeItem?.value;
    const desc = skill?.description || 'No description available';
    const name = skill?.name || activeItem?.name || 'Unknown';
    
    const boxWidth = Math.min(70, process.stdout.columns - 4);
    const separator = '─'.repeat(boxWidth);
    
    const detailView = [
      '',
      separator,
      `${colors.green('Skill:')} ${name}`,
      separator,
      colors.cyan('Description:'),
      ...wrapText(desc, boxWidth - 2).map(line => `  ${line}`),
      separator,
      colors.dim('Press any key to close...'),
      '',
    ].join('\n');

    return detailView;
  }

  if (status === 'done') {
    const selection = items.filter(isChecked);
    const answer = theme.style.answer(theme.style.renderSelectedChoices(selection, items));
    return [prefix, message, answer].filter(Boolean).join(' ');
  }

  let helpLine;
  if (theme.helpMode !== 'never' && instructions !== false) {
    if (typeof instructions === 'string') {
      helpLine = instructions;
    } else {
      const keys = [
        ['↑↓', 'navigate'],
        ['space', 'select'],
      ];
      if (shortcuts.all) keys.push([shortcuts.all, 'all']);
      if (shortcuts.invert) keys.push([shortcuts.invert, 'invert']);
      if (shortcuts.detail) keys.push([shortcuts.detail, 'details']);
      keys.push(['⏎', 'submit']);
      helpLine = theme.style.keysHelpTip(keys);
    }
  }

  const lines = [
    [prefix, message].filter(Boolean).join(' '),
    page,
    ' ',
    errorMsg ? theme.style.error(errorMsg) : '',
    helpLine,
  ]
    .filter(Boolean)
    .join('\n')
    .trimEnd();

  return `${lines}${cursorHide}`;
});

/**
 * Wrap text to fit within a given width
 */
function wrapText(text, width) {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= width) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.length > 0 ? lines : [''];
}

export { Separator };
