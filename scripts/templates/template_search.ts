async function search(
    objectClass: string,
    filter: any,
    handler: ResultsHandler,
    options?: OperationOptions
  ): Promise<SearchResult> {
    // TODO: Implement search operation
    logger.log(`Searching ${objectClass}`, filter);
    
    switch (objectClass) {
{{#objectClassCase}}      case "{{objectClass}}":
        // TODO: Search {{objectClass}} with filter
        const results = [
          {
            objectClass,
            uid: "1",
            name: "{{objectClass}}-1",
            attributes: { id: "1", name: "{{objectClass}}-1" }
          }
        ];
        for (const obj of results) {
          const cont = await handler(obj);
          if (!cont) break;
        }
        break;
{{/objectClassCase}}      default:
        throw new Error(`Search not supported for ${objectClass}`);
    }
    
    return { pagedResultsCookie: null, remainingPagedResults: null };
  }
