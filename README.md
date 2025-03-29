#   AIBOTCHAT

A WhatsApp bot powered by AI, designed for intelligent conversations and tool utilization.

##   🌟 Creators & Contacts 🌟

|   Platform     |   Link                                       |   Get in Touch!                  |
| :------------- | :------------------------------------------ | :------------------------------- |
|   GitHub       |   [xiryuuGame](https://www.github.com/xiryuuGame)   |   Explore my projects!           |
|   Instagram    |   [xiryu_05](https://www.instagram.com/xiryu_05/)   |   Visual vibes await!            |
|   Threads      |   [xiryu_05](https://www.threads.net/@xiryu_05)   |   Let's have a chat!             |
|   Email        |   [farrel.z.rahmanda@gmail.com](mailto:farrel.z.rahmanda@gmail.com)   |   For serious inquiries.       |

---

##   Features

This bot offers a range of helpful features:

* **Schedule Management:**
    * `jadwal mata pelajaran`: Provides access to class schedules.
    * `jadwal piket`: Displays duty rosters.
* **Information:**
    * `group info`: Retrieves and shares group details.
    * `info Gempa`: Retrieves and shares earthquakes information.
* **Content Generation:**
    * `image generator`: Creates images based on prompts.
* **Note-Taking:**
    * `note`: Save a note for the AI.

##   Environment Variables

To run this project, you will need to set the following environment variable in your `.env` file:

* `GEMINI_API_KEY`: Your API key for the Gemini AI service.

##   Installation

1.  **Clone the repository:**

    ```bash
    git clone [https://github.com/xiryuuGame/aibotchat](https://github.com/xiryuuGame/aibotchat)
    cd aibotchat/
    ```

2.  **Run the installation script:**

    ```bash
    ./install.sh
    ```

    This script will handle the necessary setup. Ensure you have the correct permissions to execute the script. If you encounter permission issues, grant execute permissions:

    ```bash
    chmod +x install.sh
    ./install.sh
    ```

3.  **Important:**

    Change the `bot-config.json`:

    ```json
    {
        "botname": "YOUR BOT NAME",
        "number": "YOUR BOT NUMBER",
        "owner": ["OWNER NUMBER", "OWNER NUMBER 2"],
        "ownerName": "YOUR NAME"
    }
    ```

##   How to Use

This bot can be used in both group chats and private chats on WhatsApp. Here's how to activate and use it:

1.  **Activation/Deactivation:**

    * To **activate** the AI functionality in a chat, send the message: `.toggle`
    * To **deactivate** the AI functionality, send the message: `.toggle` again.

2.  **User ID Management:**

    * When you use `.toggle` for the first time, your WhatsApp user/group ID will be added to a file named `list.json`. This file keeps track of users who have activated the AI.
    * The bot will only respond to AI commands from users/groups whose IDs are present in `list.json` and when the AI is active (toggled on).

3.  **Using AI Features:**

    * Once the AI is activated (and your ID is in `list.json`), you can use the features listed above by sending the corresponding commands. For example:
        * `jadwal mata pelajaran`
        * `image generator <your prompt>` (e.g., `image generator a cat playing piano`)
        * `note <your note>` (e.g., `note Remember to buy groceries`)

##   Contributing

We welcome your contributions! Here's how you can get involved:

1.  **Fork the repository.**
2.  **Create a new branch** for your changes: `git checkout -b my-contribution`.
3.  **Make your changes** and commit them: `git commit -am 'Add some feature'`.
4.  **Push your changes** to your fork: `git push origin my-contribution`.
5.  **Create a pull request** on GitHub to propose your changes.

Please ensure your code adheres to the existing style and includes relevant tests to maintain code quality.
