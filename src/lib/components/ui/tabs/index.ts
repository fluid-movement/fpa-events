import Root from './tabs.svelte';
import Content from './tabs-content.svelte';
import List, { tabsListVariants, type TabsListVariant } from './tabs-list.svelte';
import Trigger, { tabsTriggerVariants } from './tabs-trigger.svelte';

export {
	Root,
	Content,
	List,
	Trigger,
	tabsListVariants,
	tabsTriggerVariants,
	type TabsListVariant,
	//
	Root as Tabs,
	Content as TabsContent,
	List as TabsList,
	Trigger as TabsTrigger
};
