
export const LOCAL_STORAGE_KEYS = {
  ITEMS_INPUT: 'aislePilot_itemsInput',
  CATEGORIZED_LIST: 'aislePilot_categorizedList', // Stores the full AI output {categorizedAisles: [{aisleName, items: [{name, isSuggestion}]}]}
  CHECKED_ITEMS: 'aislePilot_checkedItems',
  ITEM_QUANTITIES: 'aislePilot_itemQuantities',
  USER_ADDED_SUGGESTIONS: 'aislePilot_userAddedSuggestions', // Stores Set<string> of names of suggested items user added
};
