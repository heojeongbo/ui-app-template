import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";

import { HomePage } from "@/pages/home";
import { currentLocale, documentTitle } from "@/shared/lib/locale";

export const Route = createFileRoute("/(auth)/(shell)/")({
	head: () => ({
		meta: [
			{ title: documentTitle(getIntlayer("home", currentLocale()).title) },
		],
	}),

	component: HomePage,
});
