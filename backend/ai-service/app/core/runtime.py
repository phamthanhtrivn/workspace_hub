from app.infrastructure.database import Database
from app.infrastructure.documents import DocumentClient
from app.modules.conversations.service import ConversationService
from app.modules.documents.service import DocumentService


class Runtime:
    def __init__(self, settings):
        self.database = Database(settings.database_url.get_secret_value())
        self.client = DocumentClient(settings)
        self.documents = DocumentService(self.database, self.client, settings)
        self.conversations = ConversationService(self.database, self.client)

    def close(self):
        self.database.engine.dispose()


def install_features(app, settings):
    from app.modules.conversations.router import router as conversations
    from app.modules.documents.router import router as documents
    from app.modules.jobs.router import router as jobs

    app.state.runtime = Runtime(settings)
    for router in (documents, conversations, jobs):
        app.include_router(router)
